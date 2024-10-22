import {Credentials} from '@loopback/authentication-jwt';
import { /* inject, */ BindingScope, inject, injectable, service} from '@loopback/core';
import {juggler, repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {v4 as uuidv4} from 'uuid';
import {AWS_LAMBDA_FUNCTIONS, PasswordHasherBindings} from '../keys';
import {User, UserCredential} from '../models';
import {UserCredentialRepository, UserRepository} from '../repositories';
import {subtractDates} from '../utils/subtract-dates';
import {AwsLambdaService} from './aws-lambda.service';
import {PasswordHasher} from './hash.password.bcryptjs';
import Transaction = juggler.Transaction;
@injectable({scope: BindingScope.TRANSIENT})
export class UserManagementService {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(UserCredentialRepository)
    public userCredentialRepository: UserCredentialRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
    @service(AwsLambdaService)
    public awsLambdaService: AwsLambdaService,) { }

  async createUserCredentials(user_credential: UserCredential, transaction?: Transaction, dontSendEmail: boolean = false): Promise<UserCredential> {
    const password = await this.passwordHasher.hashPassword(
      user_credential.password,
    );
    const userCredential = await this.userCredentialRepository.findOne({where: {user_id: user_credential.id}}, {transaction});
    if (userCredential) {
      userCredential.password = password;
      // userCredential.temp_password = password;
      await this.userRepository.credential(user_credential.id).patch(userCredential, {transaction});
    } else {
      await this.userRepository.credential(user_credential.id).create({password: password}, {transaction});
    }

    if (dontSendEmail === false) {
      this.awsLambdaService.invokeFunction(AWS_LAMBDA_FUNCTIONS.welcome, {})
        .then((data) => {
          console.log(data);
        })
        .catch((error) => {
          console.error(error);
        });
    }
    return user_credential;
  }

  async verifyCredentials(credentials: Credentials): Promise<User> {
    const {email, password} = credentials;
    const invalidCredentialsError = 'Invalid email or password.';

    if (!email) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const foundUser = await this.userRepository.findOne({
      where: {email},
    });
    // }
    if (!foundUser) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const credentialsFound = await this.userCredentialRepository.findOne({
      where: {
        user_id: foundUser.id
      }
    }
    );
    // }
    if (!credentialsFound) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const passwordMatched = await this.passwordHasher.comparePassword(
      password,
      credentialsFound.password,
    );

    if (!passwordMatched) {
      // throw new HttpErrors.Unauthorized(invalidCredentialsError);
      throw new HttpErrors.Forbidden(invalidCredentialsError);
    }

    return foundUser;
  }

  convertToUserProfile(user: User): UserProfile {
    // since first name and last_name are optional, no error is thrown if not provided
    let userName = '';
    if (user.first_name) {
      userName = `${user.first_name}`;
    }
    if (user.last_name) {
      userName = user.first_name
        ? `${userName} ${user.last_name}`
        : `${user.last_name}`;
    }

    return {
      [securityId]: user.id,
      name: userName,
      id: user.id,
      status: user.status,
      email: user.email,
    };
  }

  async requestPasswordReset(email: string): Promise<any> {
    const noAccountFoundError =
      'No account associated with the provided email address.';
    const foundUser = await this.userRepository.findOne({
      where: {email},
    });

    if (!foundUser) {
      throw new HttpErrors.NotFound(noAccountFoundError);
    }

    const user = await this.updateResetRequestLimit(foundUser);

    try {
      await this.userRepository.updateById(user.id, user);
    } catch (e: any) {
      return e;
    }

    // Lambda invokation for emails
    const send_email = await this.awsLambdaService.invokeFunction(AWS_LAMBDA_FUNCTIONS.resetPassword, {user_id: user.id});
    return send_email;
  }

  async updateResetRequestLimit(user: User): Promise<User> {
    const resetTimestampDate = new Date(user.reset_timestamp);

    const difference = await subtractDates(resetTimestampDate);

    if (difference === 0) {
      user.reset_count = user.reset_count + 1;

      if (user.reset_count > +(process.env.PASSWORD_RESET_EMAIL_LIMIT ?? 5)) {
        throw new HttpErrors.TooManyRequests(
          'Account has reached daily limit for sending password-reset requests',
        );
      }
    } else {
      user.reset_timestamp = new Date().toISOString();
      user.reset_count = 1;
    }

    user.reset_key = uuidv4();
    user.reset_key_timestamp = new Date().toISOString();

    return user;
  }
}



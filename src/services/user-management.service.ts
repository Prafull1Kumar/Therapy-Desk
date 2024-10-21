import { /* inject, */ BindingScope, inject, injectable, service} from '@loopback/core';
import {juggler, repository} from '@loopback/repository';
import {AWS_LAMBDA_FUNCTIONS, PasswordHasherBindings} from '../keys';
import {UserCredential} from '../models';
import {UserCredentialRepository, UserRepository} from '../repositories';
import {AwsLambdaService} from './aws-lambda.service';
import {PasswordHasher} from './hash.password.bcryptjs';
import Transaction = juggler.Transaction;
@injectable({scope: BindingScope.TRANSIENT})
export class UserManagementService {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(UserCredentialRepository)
    public userCredentialsRepository: UserCredentialRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
    @service(AwsLambdaService)
    public awsLambdaService: AwsLambdaService,) { }

  async createUserCredentials(user_credential: UserCredential, transaction?: Transaction, dontSendEmail: boolean = false): Promise<UserCredential> {
    const password = await this.passwordHasher.hashPassword(
      user_credential.password,
    );
    const userCredential = await this.userCredentialsRepository.findOne({where: {user_id: user_credential.id}}, {transaction});
    if (userCredential) {
      userCredential.password = password;
      // userCredential.temp_password = password;
      await this.userRepository.credential(user_credential.id).patch(userCredential, {transaction});
    } else {
      await this.userRepository.credential(user_credential.id).create({password: user_credential.password}, {transaction});
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
}

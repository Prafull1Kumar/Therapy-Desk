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
import {EmailService} from './email-service.service';
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
    @inject('services.EmailService')
    protected emailService: EmailService,
    @service(AwsLambdaService)
    public awsLambdaService: AwsLambdaService,) { }

  /**
 * Creates or updates user credentials with hashed password and optionally sends welcome email
 * @param user_credential User credential object containing password
 * @param transaction Optional database transaction for atomic operations
 * @param dontSendEmail Flag to control welcome email sending (default: false)
 * @returns Promise resolving to the created/updated user credential
 */
  async createUserCredentials(
    user_credential: UserCredential,
    transaction?: Transaction,
    dontSendEmail: boolean = false
  ): Promise<UserCredential> {
    // Hash the provided password using secure password hasher
    const password = await this.passwordHasher.hashPassword(
      user_credential.password,
    );

    // Check if user already has credentials
    const userCredential = await this.userCredentialRepository.findOne(
      {where: {user_id: user_credential.id}},
      {transaction}
    );

    if (userCredential) {
      // Update existing credentials with new hashed password
      userCredential.password = password;
      await this.userRepository.credential(user_credential.id)
        .patch(userCredential, {transaction});
    } else {
      // Create new credentials if none exist
      await this.userRepository.credential(user_credential.id)
        .create({password: password}, {transaction});
    }

    // Send welcome email unless explicitly disabled
    if (dontSendEmail === false) {
      // Asynchronously invoke welcome email Lambda function
      this.awsLambdaService.invokeFunction(AWS_LAMBDA_FUNCTIONS.welcome, {})
        .then((data) => {
          console.log(data);  // Log success response
        })
        .catch((error) => {
          console.error(error);  // Log any errors in email sending
        });
    }

    // Return the user credential object
    return user_credential;
  }

  /**
 * Verifies user credentials by checking email and password
 * Implements secure authentication with multiple validation steps
 * @param credentials Object containing email and password
 * @returns Promise resolving to authenticated User object
 * @throws HttpErrors.Unauthorized for missing/invalid credentials
 * @throws HttpErrors.Forbidden for incorrect password
 */
  async verifyCredentials(credentials: Credentials): Promise<User> {
    // Extract email and password from credentials
    const {email, password} = credentials;

    // Define generic error message for security
    // Using a generic message prevents username enumeration
    const invalidCredentialsError = 'Invalid email or password.';

    // Check if email is provided
    if (!email) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    // Look up user by email
    const foundUser = await this.userRepository.findOne({
      where: {email},
    });

    // If user not found, throw error
    // Using same error message as above for security
    if (!foundUser) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    // Look up user's credentials
    const credentialsFound = await this.userCredentialRepository.findOne({
      where: {
        user_id: foundUser.id
      }
    });

    // If no credentials found, throw error
    // This shouldn't happen in normal flow but handles edge cases
    if (!credentialsFound) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    // Compare provided password with stored hash
    const passwordMatched = await this.passwordHasher.comparePassword(
      password,
      credentialsFound.password,
    );

    // If password doesn't match, throw forbidden error
    // Using Forbidden instead of Unauthorized for incorrect password
    if (!passwordMatched) {
      throw new HttpErrors.Forbidden(invalidCredentialsError);
    }

    // Return user object if all validations pass
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

  /**
 * Handles password reset requests with rate limiting and email notification
 * @param email Email address of the user requesting password reset
 * @returns Promise resolving to email sending confirmation
 * @throws HttpErrors.NotFound if no account exists for email
 */
  async requestPasswordReset(email: string): Promise<any> {
    // Define error message for non-existent accounts
    // Specific message since we want users to know if email doesn't exist
    const noAccountFoundError =
      'No account associated with the provided email address.';

    // Look up user by email address
    const foundUser = await this.userRepository.findOne({
      where: {email},
    });

    // If no user found with this email, throw error
    if (!foundUser) {
      throw new HttpErrors.NotFound(noAccountFoundError);
    }

    // Check and update reset request limits
    // This likely includes logic to prevent abuse by limiting reset attempts
    const user = await this.updateResetRequestLimit(foundUser);

    // Update user record with new reset information
    try {
      await this.userRepository.updateById(user.id, user);
    } catch (e: any) {
      // Return any errors that occur during update
      return e;
    }

    // Send password reset email via AWS Lambda
    const send_email = await this.awsLambdaService.invokeFunction(
      AWS_LAMBDA_FUNCTIONS.resetPassword,
      {user_id: user.id}
    );

    // Return the email sending response
    return send_email;
  }

  /**
 * Updates and validates password reset request limits for a user
 * Implements daily rate limiting and reset key management
 * @param user User object to update reset limits
 * @returns Promise resolving to updated User object
 * @throws HttpErrors.TooManyRequests if daily limit exceeded
 */
  async updateResetRequestLimit(user: User): Promise<User> {
    // Convert stored reset timestamp to Date object
    const resetTimestampDate = new Date(user.reset_timestamp);

    // Calculate days difference between last reset request and now
    // Returns 0 if same day, positive number if different days
    const difference = await subtractDates(resetTimestampDate);

    if (difference === 0) {
      // If request is on the same day
      // Increment the reset request counter
      user.reset_count = user.reset_count + 1;

      // Check if user has exceeded daily reset limit
      // Default limit is 5 if environment variable not set
      if (user.reset_count > +(process.env.PASSWORD_RESET_EMAIL_LIMIT ?? 5)) {
        throw new HttpErrors.TooManyRequests(
          'Account has reached daily limit for sending password-reset requests',
        );
      }
    } else {
      // If request is on a different day
      // Reset the timestamp to current time
      user.reset_timestamp = new Date().toISOString();
      // Reset the counter to 1 for new day
      user.reset_count = 1;
    }

    // Generate new reset key (UUID) for this request
    user.reset_key = uuidv4();
    // Store timestamp of when reset key was generated
    user.reset_key_timestamp = new Date().toISOString();

    // Return updated user object
    return user;
  }
}



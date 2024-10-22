import {authenticate, TokenService} from '@loopback/authentication';
import {Credentials, TokenServiceBindings} from '@loopback/authentication-jwt';
import {inject, service} from '@loopback/core';
import {
  IsolationLevel,
  repository
} from '@loopback/repository';
import {
  getModelSchemaRef,
  HttpErrors,
  post,
  requestBody,
  response
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {AWS_LAMBDA_FUNCTIONS} from '../keys';
import {User} from '../models';
import {OrganizationRepository, RoleRepository, UserRepository} from '../repositories';
import {AwsLambdaService, UserManagementService} from '../services';

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @service(AwsLambdaService)
    public awsLambdaService: AwsLambdaService,
    @repository(RoleRepository)
    public roleRepository: RoleRepository,
    @repository(OrganizationRepository)
    public organizationRepository: OrganizationRepository,
    @service(UserManagementService)
    public userManagementService: UserManagementService,
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
  ) { }

  @post('/users/reset-password/init', {
    responses: {
      '200': {
        description: 'Confirmation that reset password email has been sent',
      },
    },
  })
  async resetPasswordInit(
    @requestBody() resetPasswordInit: any,
  ): Promise<any> {
    if (this.isValidEmail(resetPasswordInit.email)) {
      throw new HttpErrors.UnprocessableEntity("Error. Please check your email address.");
    }

    const password_reset = await this.userManagementService.requestPasswordReset(
      resetPasswordInit.email
    );

    if (password_reset?.ResponseMetadata?.HTTPStatusCode == 200) {
      return {success: true, message: "Successfully sent reset password link"};
    }
    else {
      throw new HttpErrors.InternalServerError(
        "Something went wrong. Please try again or contact your administrator.",
      );
    }
  }

  @post('/users/resend-email/init')
  @response(200, {
    description: 'Email Resend',
    content: {'application/json': {schema: getModelSchemaRef(User)}},
  })
  async resendEmail(): Promise<void> {
    this.awsLambdaService.invokeFunction(AWS_LAMBDA_FUNCTIONS.welcome, {})
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.error(error);
      });
    return;
  }

  @post('/users/logout', {
    responses: {
      '200': {
        description: 'Logout from currect device',
      },
    },
  })
  @authenticate('jwt')
  async logout(
    @requestBody() payload: {token: string}
  ): Promise<any> {
    await this.userRepository.tokens(this.user.id).delete({token: payload.token})
    return {success: true, message: "Logout Success"};
  }

  @post('/users/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody({}) credentials: Credentials
  ): Promise<{token: string, redirect?: string, api?: string, ui?: string} | void> {
    credentials.email = credentials.email.toLocaleLowerCase()

    const user = await this.userManagementService.verifyCredentials(credentials);

    //user found so we proceed

    // convert a User object into a UserProfile object (reduced set of properties)
    const userProfile = this.userManagementService.convertToUserProfile(user);

    // create a JSON Web Token based on the user profile
    const token = await this.jwtService.generateToken(userProfile);
    await this.userRepository.tokens(userProfile.id).create({token});
    return {
      token,
    };
  }

  @post('/user/create')
  @response(200, {
    description: 'User model instance',
    content: {'application/json': {schema: getModelSchemaRef(User)}},
  })
  async create(
    @requestBody({})
    user: any
  ): Promise<User> {
    const transaction = await this.userRepository.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);
    try {

      const existingUser = await this.userRepository.findOne({where: {email: user.email.toLocaleLowerCase()}});
      if (existingUser)
        throw new HttpErrors.Forbidden('Error. This email address already exists.');

      const email = user.email.toLocaleLowerCase();
      if (email && !this.isValidEmail(email)) {
        console.error("The email address is invalid.");
        throw new HttpErrors.BadRequest("The email address is invalid.");
      }

      const password = user.password;
      delete user.password;
      // const password = generatePassword.generate({
      //   length: 8,
      //   numbers: true,
      // });

      user.status = 'PROCESSING'

      let newUser = await this.userRepository.create(user, {transaction});

      await this.userManagementService.createUserCredentials(Object.assign(newUser, {
        password: password,
        user_id: newUser.id
      }), transaction);
      await transaction.commit();
      return newUser
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  isValidEmail(email): Boolean {
    // Regular expression for validating an email address
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

}

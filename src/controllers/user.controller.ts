import {authenticate} from '@loopback/authentication';
import {inject, service} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import generatePassword from 'generate-password';
import {User} from '../models';
import {OrganizationRepository, UserRepository} from '../repositories';
import {UserManagementService} from '../services';

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(OrganizationRepository)
    public organizationRepository: OrganizationRepository,
    @service(UserManagementService)
    public userManagementService: UserManagementService,
    @inject(SecurityBindings.USER)
    public currentUserProfile: UserProfile,
  ) { }

  @post('/user')
  @response(200, {
    description: 'User model instance',
    content: {'application/json': {schema: getModelSchemaRef(User)}},
  })
  @authenticate('jwt')
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {
            title: 'NewUser',
            exclude: ['id'],
          }),
        },
      },
    })
    user: Omit<User, 'id'>,
  ): Promise<User> {
    try {

      const existingUser = await this.userRepository.findOne({where: {email: user.email.toLocaleLowerCase()}});
      if (existingUser)
        throw new HttpErrors.Forbidden('Error. This email address already exists.');

      const email = user.email.toLocaleLowerCase();
      if (email && !this.isValidEmail(email)) {
        console.error("The email address is invalid.");
        throw new HttpErrors.BadRequest("The email address is invalid.");
      }
      const password = generatePassword.generate({
        length: 8,
        numbers: true,
      });
      let organization_name = user.organization.name;
      let organization_type = user.organization.type;
      delete user.organization;
      let existingOrganization = await this.organizationRepository.findOne({where: {and: [{name: organization_name}, {type: organization_type}]}});
      if (!existingOrganization) {
        let newOrganization = await this.organizationRepository.create(user.organization);
        user.organization_id = newOrganization.id;
      }
      else user.organization_id = existingOrganization.id;

      user.status = 'PROCESSING'

      let newUser = await this.userRepository.create(user);

      await this.userManagementService.createUserCredentials(Object.assign(newUser, {
        password: password,
        user_id: this.currentUserProfile.id
      }));

      return newUser
    } catch (error) {
      throw error;
    }
  }

  isValidEmail(email): Boolean {
    // Regular expression for validating an email address
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  @get('/user/count')
  @response(200, {
    description: 'User model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(User) where?: Where<User>,
  ): Promise<Count> {
    return this.userRepository.count(where);
  }

  @get('/user')
  @response(200, {
    description: 'Array of User model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(User, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(User) filter?: Filter<User>,
  ): Promise<User[]> {
    return this.userRepository.find(filter);
  }

  @patch('/user')
  @response(200, {
    description: 'User PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {partial: true}),
        },
      },
    })
    user: User,
    @param.where(User) where?: Where<User>,
  ): Promise<Count> {
    return this.userRepository.updateAll(user, where);
  }

  @get('/user/{id}')
  @response(200, {
    description: 'User model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(User, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(User, {exclude: 'where'}) filter?: FilterExcludingWhere<User>
  ): Promise<User> {
    return this.userRepository.findById(id, filter);
  }

  @patch('/user/{id}')
  @response(204, {
    description: 'User PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {partial: true}),
        },
      },
    })
    user: User,
  ): Promise<void> {
    await this.userRepository.updateById(id, user);
  }

  @put('/user/{id}')
  @response(204, {
    description: 'User PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() user: User,
  ): Promise<void> {
    await this.userRepository.replaceById(id, user);
  }

  @del('/user/{id}')
  @response(204, {
    description: 'User DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.userRepository.deleteById(id);
  }
}

import {service} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  IsolationLevel,
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
import generatePassword from 'generate-password';
import _ from 'lodash';
import {User} from '../models';
import {OrganizationRepository, RoleRepository, UserRepository} from '../repositories';
import {UserManagementService} from '../services';

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(RoleRepository)
    public roleRepository: RoleRepository,
    @repository(OrganizationRepository)
    public organizationRepository: OrganizationRepository,
    @service(UserManagementService)
    public userManagementService: UserManagementService,
    // @inject(SecurityBindings.USER)
    // public currentUserProfile: UserProfile,
  ) { }

  @post('/user')
  @response(200, {
    description: 'User model instance',
    content: {'application/json': {schema: getModelSchemaRef(User)}},
  })
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
      const password = generatePassword.generate({
        length: 8,
        numbers: true,
      });

      user.status = 'PROCESSING'

      let newUser = await this.userRepository.create(user, {transaction});

      await this.userManagementService.createUserCredentials(Object.assign(newUser, {
        password: password,
        user_id: newUser.id
      }),transaction);
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
  // @authenticate('jwt')
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
    const transaction = await this.userRepository.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);
    try {
      let role = user.role;
      // delete user?.role;
      if (role) {
        let organization_name = role.organization.name;
        let organization_type = role.organization.type;
        delete role.organization;

        let existingOrganization = await this.organizationRepository.findOne({where: {and: [{name: organization_name}, {type: organization_type}]}});
        if (!existingOrganization) {
          let newOrganization = await this.organizationRepository.create(user.organization, {transaction});
          role.organization_id = newOrganization.id;
        }
        else role.organization_id = existingOrganization.id;

        if (!role.id) {
          await this.roleRepository.updateAll({status: 'INACTIVE'}, {user_id: id}, {transaction});
          await this.roleRepository.create(role, {transaction});
        }
        else await this.roleRepository.updateById(role.id, role, {transaction});
      }
      await this.userRepository.updateById(id, _.omit(user, ['role']), {transaction});
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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

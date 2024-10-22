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
  param,
  patch,
  put,
  requestBody,
  response
} from '@loopback/rest';
import _ from 'lodash';
import {User} from '../models';
import {OrganizationRepository, RoleRepository, UserRepository} from '../repositories';
import {AwsLambdaService, UserManagementService} from '../services';

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @service(AwsLambdaService)
    public awsLambdaService: AwsLambdaService,
    @repository(RoleRepository)
    public roleRepository: RoleRepository,
    @repository(OrganizationRepository)
    public organizationRepository: OrganizationRepository,
    @service(UserManagementService)
    public userManagementService: UserManagementService,
    // @inject(SecurityBindings.USER)
    // public currentUserProfile: UserProfile,
  ) { }

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

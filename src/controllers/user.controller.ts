import {service} from '@loopback/core';
import {
  FilterExcludingWhere,
  IsolationLevel,
  repository
} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  param,
  patch,
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
    // This ensures consistent reads while the transaction is in progress
    const transaction = await this.userRepository.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);

    try {
      // Extract role information from user object
      let role = user.role;

      // Handle role and organization updates if role exists
      if (role) {
        // Extract organization details from the role
        let organization_name = role.organization.name;
        let organization_type = role.organization.type;
        delete role.organization;  // Remove organization object from role

        // Check if organization already exists in database
        let existingOrganization = await this.organizationRepository.findOne({
          where: {
            and: [
              {name: organization_name},
              {type: organization_type}
            ]
          }
        });

        // If organization doesn't exist, create new one
        if (!existingOrganization) {
          let newOrganization = await this.organizationRepository.create(
            user.organization,
            {transaction}
          );
          role.organization_id = newOrganization.id;
        }
        // If organization exists, use its ID
        else {
          role.organization_id = existingOrganization.id;
        }

        // Handle role updates
        if (!role.id) {
          // If new role, deactivate existing roles and create new one
          await this.roleRepository.updateAll(
            {status: 'INACTIVE'},
            {user_id: id},
            {transaction}
          );
          await this.roleRepository.create(role, {transaction});
        }
        // If existing role, update it
        else {
          await this.roleRepository.updateById(role.id, role, {transaction});
        }
      }

      // Update user information, excluding role data
      await this.userRepository.updateById(
        id,
        _.omit(user, ['role']),
        {transaction}
      );

      // Commit the transaction if all operations succeed
      await transaction.commit();

    } catch (error) {
      // Rollback all changes if any operation fails
      await transaction.rollback();
      throw error;  // Re-throw error for higher-level handling
    }
  }
}

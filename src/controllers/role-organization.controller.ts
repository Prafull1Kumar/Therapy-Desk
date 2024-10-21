import {
  repository,
} from '@loopback/repository';
import {
  param,
  get,
  getModelSchemaRef,
} from '@loopback/rest';
import {
  Role,
  Organization,
} from '../models';
import {RoleRepository} from '../repositories';

export class RoleOrganizationController {
  constructor(
    @repository(RoleRepository)
    public roleRepository: RoleRepository,
  ) { }

  @get('/roles/{id}/organization', {
    responses: {
      '200': {
        description: 'Organization belonging to Role',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Organization)},
          },
        },
      },
    },
  })
  async getOrganization(
    @param.path.string('id') id: typeof Role.prototype.id,
  ): Promise<Organization> {
    return this.roleRepository.organization(id);
  }
}

import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest';
import {
  Token,
  User,
} from '../models';
import {UserRepository} from '../repositories';

export class UserTokenController {
  constructor(
    @repository(UserRepository) protected userRepository: UserRepository,
  ) { }

  @get('/users/{id}/tokens', {
    responses: {
      '200': {
        description: 'Array of User has many Token',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Token)},
          },
        },
      },
    },
  })
  async find(
    @param.path.string('id') id: string,
    @param.query.object('filter') filter?: Filter<Token>,
  ): Promise<Token[]> {
    return this.userRepository.tokens(id).find(filter);
  }

  @post('/users/{id}/tokens', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {'application/json': {schema: getModelSchemaRef(Token)}},
      },
    },
  })
  async create(
    @param.path.string('id') id: typeof User.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Token, {
            title: 'NewTokenInUser',
            exclude: ['id'],
            optional: ['user_id']
          }),
        },
      },
    }) token: Omit<Token, 'id'>,
  ): Promise<Token> {
    return this.userRepository.tokens(id).create(token);
  }

  @patch('/users/{id}/tokens', {
    responses: {
      '200': {
        description: 'User.Token PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async patch(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Token, {partial: true}),
        },
      },
    })
    token: Partial<Token>,
    @param.query.object('where', getWhereSchemaFor(Token)) where?: Where<Token>,
  ): Promise<Count> {
    return this.userRepository.tokens(id).patch(token, where);
  }

  @del('/users/{id}/tokens', {
    responses: {
      '200': {
        description: 'User.Token DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async delete(
    @param.path.string('id') id: string,
    @param.query.object('where', getWhereSchemaFor(Token)) where?: Where<Token>,
  ): Promise<Count> {
    return this.userRepository.tokens(id).delete(where);
  }
}

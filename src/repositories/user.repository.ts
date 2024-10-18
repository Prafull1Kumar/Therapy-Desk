import {inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, HasManyRepositoryFactory, HasOneRepositoryFactory} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {User, UserRelations, Token, UserCredential} from '../models';
import {TokenRepository} from './token.repository';
import {UserCredentialRepository} from './user-credential.repository';

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
> {

  public readonly tokens: HasManyRepositoryFactory<Token, typeof User.prototype.id>;

  public readonly credentials: HasOneRepositoryFactory<UserCredential, typeof User.prototype.id>;

  constructor(
    @inject('datasources.Postgresql') dataSource: PostgresqlDataSource, @repository.getter('TokenRepository') protected tokenRepositoryGetter: Getter<TokenRepository>, @repository.getter('UserCredentialRepository') protected userCredentialRepositoryGetter: Getter<UserCredentialRepository>,
  ) {
    super(User, dataSource);
    this.credentials = this.createHasOneRepositoryFactoryFor('credentials', userCredentialRepositoryGetter);
    this.registerInclusionResolver('credentials', this.credentials.inclusionResolver);
    this.tokens = this.createHasManyRepositoryFactoryFor('tokens', tokenRepositoryGetter,);
    this.registerInclusionResolver('tokens', this.tokens.inclusionResolver);
  }
}

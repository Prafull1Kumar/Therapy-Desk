import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, HasManyRepositoryFactory, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {Role, Token, User, UserCredential, UserRelations} from '../models';
import {RoleRepository} from './role.repository';
import {TokenRepository} from './token.repository';
import {UserCredentialRepository} from './user-credential.repository';

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
> {

  public readonly tokens: HasManyRepositoryFactory<Token, typeof User.prototype.id>;

  // public readonly credentials: HasOneRepositoryFactory<UserCredential, typeof User.prototype.id>;

  public readonly credential: HasOneRepositoryFactory<UserCredential, typeof User.prototype.id>;

  public readonly role: HasOneRepositoryFactory<Role, typeof User.prototype.id>;

  constructor(
    @inject('datasources.Postgresql') dataSource: PostgresqlDataSource, @repository.getter('TokenRepository') protected tokenRepositoryGetter: Getter<TokenRepository>, @repository.getter('UserCredentialRepository') protected userCredentialRepositoryGetter: Getter<UserCredentialRepository>, @repository.getter('RoleRepository') protected roleRepositoryGetter: Getter<RoleRepository>,
  ) {
    super(User, dataSource);
    this.role = this.createHasOneRepositoryFactoryFor('role', roleRepositoryGetter);
    this.registerInclusionResolver('role', this.role.inclusionResolver);
    this.credential = this.createHasOneRepositoryFactoryFor('credential', userCredentialRepositoryGetter);
    this.registerInclusionResolver('credential', this.credential.inclusionResolver);
    // this.credentials = this.createHasOneRepositoryFactoryFor('credentials', userCredentialRepositoryGetter);
    // this.registerInclusionResolver('credentials', this.credentials.inclusionResolver);
    this.tokens = this.createHasManyRepositoryFactoryFor('tokens', tokenRepositoryGetter,);
    this.registerInclusionResolver('tokens', this.tokens.inclusionResolver);
  }
}

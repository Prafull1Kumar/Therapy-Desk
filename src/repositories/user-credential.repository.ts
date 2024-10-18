import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {UserCredential, UserCredentialRelations} from '../models';

export class UserCredentialRepository extends DefaultCrudRepository<
  UserCredential,
  typeof UserCredential.prototype.id,
  UserCredentialRelations
> {
  constructor(
    @inject('datasources.Postgresql') dataSource: PostgresqlDataSource,
  ) {
    super(UserCredential, dataSource);
  }
}

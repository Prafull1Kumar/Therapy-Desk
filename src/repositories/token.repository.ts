import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresqlDataSource} from '../datasources';
import {Token, TokenRelations} from '../models';

export class TokenRepository extends DefaultCrudRepository<
  Token,
  typeof Token.prototype.id,
  TokenRelations
> {
  constructor(
    @inject('datasources.Postgresql') dataSource: PostgresqlDataSource,
  ) {
    super(Token, dataSource);
  }
}

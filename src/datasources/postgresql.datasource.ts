import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

const config = {
  name: 'Postgresql',
  connector: 'postgresql',
  url: '',
  host: 'app-2.cji8semeum2o.us-east-2.rds.amazonaws.com',
  port: 5432,
  user: 'postgres',
  password: 'doneWithThisShit',
  database: 'production'
};
// const config = {
//   name: 'Postgresql',
//   connector: 'postgresql',
//   url: '',
//   host: 'localhost',
//   port: 5432,
//   user: 'postgres',
//   password: 'Pra@1ful',
//   database: 'app'
// };
// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class PostgresqlDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'Postgresql';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.Postgresql', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}

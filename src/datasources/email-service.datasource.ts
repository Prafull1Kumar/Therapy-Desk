import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

const config = {
  name: 'EmailService',
  connector: 'rest',
  baseURL: '',
  crud: false,
  options: {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
  },
  operations: [
    {
      template: {
        method: 'POST',
        url: 'http://127.0.0.1:3001/send_email?{data}',
        query: {
          data: '{data}',
        },
        body: {
          data: '{data}',
        }
      },
      functions: {
        "getPayload": ['data'],
      },
    },
  ],
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class EmailServiceDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'EmailService';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.EmailService', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}

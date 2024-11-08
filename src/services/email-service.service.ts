import {inject, Provider} from '@loopback/core';
import {getService} from '@loopback/service-proxy';
import {EmailServiceDataSource} from '../datasources';

// export interface EmailService {
//   // this is where you define the Node.js methods that will be
//   // mapped to REST/SOAP/gRPC operations as stated in the datasource
//   // json file.
// }

export interface Payload {
  payload: string;
}

export interface EmailService {
  getPayload(data: string): Promise<Payload>;
}


export class EmailServiceProvider implements Provider<EmailService> {
  constructor(
    // EmailService must match the name property in the datasource json file
    @inject('datasources.EmailService')
    protected dataSource: EmailServiceDataSource = new EmailServiceDataSource(),
  ) { }

  value(): Promise<EmailService> {
    return getService(this.dataSource);
  }
}

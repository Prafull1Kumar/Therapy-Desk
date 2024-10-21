import {BindingScope, injectable} from '@loopback/core';
import {Lambda} from 'aws-sdk';
import {merge} from 'lodash';

@injectable({scope: BindingScope.TRANSIENT})
export class AwsLambdaService {
  private lambda: Lambda;

  constructor() {
    let awsConfig = {region: 'us-east-2'};
    if (process.env.SAM_LOCAL === 'true') {//for testing, remove if not running sam local
      awsConfig['endpoint'] = 'http://localhost:3001'; // or whereever sam local is running
    }
    this.lambda = new Lambda(awsConfig);
  }

  async invokeFunction(functionName: string, payload?: any): Promise<Lambda.Types.InvocationResponse> {
    const params: Lambda.Types.InvocationRequest = {
      FunctionName: functionName,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(merge(payload, {
        DB_HOST: process.env.DB_HOST,
        DB_DATABASE: process.env.DB_DATABASE,
        DB_PORT: process.env.DB_PORT,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_SCHEMA: process.env.DB_SCHEMA,
        BaseUrl: process.env.BASE_URL,
      })),
    };

    if (payload !== undefined) {
      params.Payload = JSON.stringify(payload);
    }

    return new Promise((resolve, reject) => {
      this.lambda.invoke(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          const parsedPayload = JSON.parse(data.Payload?.toString() || '{}');
          if (parsedPayload.statusCode !== 200) {
            reject(parsedPayload.body);
          } else {
            resolve(parsedPayload.body);
          }
        }
      });
    });
  }
}

export interface AwsLambdaService {
  invokeFunction(functionName: string, payload?: any): Promise<Lambda.Types.InvocationResponse>;
}

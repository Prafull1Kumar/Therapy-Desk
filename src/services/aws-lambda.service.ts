import {BindingScope, injectable} from '@loopback/core';
import {Lambda} from 'aws-sdk';
import {merge} from 'lodash';

@injectable({scope: BindingScope.TRANSIENT})
export class AwsLambdaService {
  private lambda: Lambda;

  constructor() {
    let awsConfig = {region: 'us-east-2'};
    if (process.env.SAM_LOCAL === 'true') {//for testing, remove if not running sam local
      awsConfig['endpoint'] = 'http://127.0.0.1:3001'; // or whereever sam local is running
    }
    this.lambda = new Lambda(awsConfig);
  }

  /**
 * Invokes an AWS Lambda function with database configuration and custom payload
 * @param functionName Name of the Lambda function to invoke
 * @param payload Optional payload to send to the Lambda function
 * @returns Promise resolving to the Lambda function response
 */
  async invokeFunction(
    functionName: string,
    payload?: any
  ): Promise<Lambda.Types.InvocationResponse> {
    // Prepare Lambda invocation parameters
    // Merge provided payload with database configuration from environment variables
    const params: Lambda.Types.InvocationRequest = {
      FunctionName: functionName,
      InvocationType: 'RequestResponse',  // Synchronous invocation
      Payload: JSON.stringify(merge(payload, {
        // Add database configuration from environment variables
        DB_HOST: process.env.DB_HOST,
        DB_DATABASE: process.env.DB_DATABASE,
        DB_PORT: process.env.DB_PORT,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_SCHEMA: process.env.DB_SCHEMA,
        BaseUrl: process.env.BASE_URL,
      })),
    };

    // If payload is provided, override the Payload parameter
    // This appears redundant with the merge above and might need review
    if (payload !== undefined) {
      params.Payload = JSON.stringify(payload);
    }

    // Return promise wrapping Lambda invocation
    return new Promise((resolve, reject) => {
      // Invoke Lambda function
      this.lambda.invoke(params, (err, data) => {
        if (err) {
          // Reject promise if Lambda invocation fails
          reject(err);
        } else {
          // Parse Lambda response payload
          const parsedPayload = JSON.parse(data.Payload?.toString() || '{}');

          // Check response status code
          if (parsedPayload.statusCode !== 200) {
            // Reject if status code indicates error
            reject(parsedPayload.body);
          } else {
            // Resolve with successful response body
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

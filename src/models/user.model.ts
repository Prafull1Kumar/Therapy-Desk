import {Entity, hasMany, model, property, hasOne} from '@loopback/repository';
import {Token} from './token.model';
import {UserCredential} from './user-credential.model';

@model({settings: {strict: false}})
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuid'
  })
  id: string;

  @property({
    type: 'string',
    required: true
  })
  first_name: string;

  @property({
    type: 'string'
  })
  last_name: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      format: 'email',
      transform: ['toLowerCase'],
    },
  })
  email: string;

  @property({
    type: 'string',
    unique: false,
    optional: true
  })
  phone?: string;

  @property({
    type: 'string',
    jsonSchema: {
      enum: ['INACTIVE', 'ACTIVE', 'NOT_VERIFIED', 'REQUESTED'],
    },
    default: 'NOT_VERIFIED'
  })
  status: string;

  @property({
    type: 'string',
    required: true,
  })
  address_line_1: string;

  @property({
    type: 'string',
    required: false,
  })
  address_line_2: string;

  @property({
    type: 'string',
    required: false,
  })
  city: string;

  @property({
    type: 'string',
    required: true,
  })
  country: string;

  @property({
    type: 'string',
    required: false,
  })
  zip_code: string;

  @property({
    type: 'string'
  })
  last_login?: string;

  @property({
    type: 'string',
  })
  reset_key?: string;

  @property({
    type: 'number',
  })
  reset_count: number;

  @property({
    type: 'string',
  })
  reset_timestamp: string;

  @property({
    type: 'string',
  })
  reset_key_timestamp: string;

  @property({
    type: 'string',
  })
  designation: string;

  @hasMany(() => Token, {keyTo: 'user_id'})
  tokens: Token[];

  @hasOne(() => UserCredential, {keyTo: 'user_id'})
  credential: UserCredential;
  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;

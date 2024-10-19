import {Entity, model, property} from '@loopback/repository';

@model({settings: {strict: false}})
export class Role extends Entity {
  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuid'
  })
  id: string;

  @property({
    type: 'string',
    jsonSchema: {
      enum: ['INACTIVE', 'ACTIVE'],
    },
    default: 'ACTIVE'
  })
  status: string;

  @property({
    type: 'string',
    jsonSchema: {
      enum: ['SUPER_CSM', 'CSM', 'SYSTEM_ADMIN', 'ADMIN', 'EMPLOYEE'],
    },
    default: 'EMPLOYEE'
  })
  type: string;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Role>) {
    super(data);
  }
}

export interface RoleRelations {
  // describe navigational properties here
}

export type RoleWithRelations = Role & RoleRelations;

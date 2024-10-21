import {Entity, model, property} from '@loopback/repository';

@model({
  name: 'organization',
  strict: false
})
export class Organization extends Entity {
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
      enum: ['PROFESSIONAL', 'EDUCATIONAL', 'SPORTS'],
    },
    default: 'EDUCATIONAL'
  })
  type?: string;





  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Organization>) {
    super(data);
  }
}

export interface OrganizationRelations {
  // describe navigational properties here
}

export type OrganizationWithRelations = Organization & OrganizationRelations;

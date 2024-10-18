import {Entity, model, property} from '@loopback/repository';

@model()
export class Token extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuid'
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  token: string;

  @property({
    type: 'string',
  })
  user_id?: string;


  @property({
    type: 'string',
  })
  device_os?: string;

  constructor(data?: Partial<Token>) {
    super(data);
  }
}

export interface TokenRelations {
  // describe navigational properties here
}

export type TokenWithRelations = Token & TokenRelations;

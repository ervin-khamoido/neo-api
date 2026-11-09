import { readable } from '@ts-awesome/model-reader'
import { OrderBuilder, WhereBuilder } from '@ts-awesome/orm'
import { IOpenApiParameterArgs } from '@ts-awesome/openapi/dist/decorators/interfaces'

type ClassOf<T> = new () => T;

export function DescribeQueryParamsFor<T>(Model: ClassOf<T>): Record<string, IOpenApiParameterArgs> {
  return {
    limit: {
      schema: {
        type: 'number',
      },
    },
    offset: {
      schema: {
        type: 'number',
      },
    },
    orderBy: {
      schema: {
        type: 'string',
      },
    },
    count: {
      schema: {
        type: 'boolean',
      },
    },
    q: {
      schema: {
        type: 'string',
      },
    },
  }
}

export class GetListInput<T> {
  @readable(true)
  public readonly limit?: number

  @readable(true)
  public readonly offset?: number

  @readable(true)
  public readonly orderBy?: OrderBuilder<T>

  @readable(true)
  public readonly countOnly?: boolean

  @readable(true)
  public readonly query?: WhereBuilder<T>
}

export function DescribeExportQuery<T>(Model: ClassOf<T>): Record<string, IOpenApiParameterArgs> {
  return {
    orderBy: {
      schema: {
        type: 'string',
      },
    },
    q: {
      schema: {
        type: 'string',
      },
    },
  }
}

export class ExportQuery<T> {
  @readable(true)
  public readonly orderBy?: OrderBuilder<T>

  @readable(true)
  public readonly query?: WhereBuilder<T>
}

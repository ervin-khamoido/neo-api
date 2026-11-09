2021

import { inject, injectable, named } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { FreshdeskError } from '../models/freshdesk'
import { HttpTransportSymbol, IHttpTransport } from '@ts-awesome/request'
import { readable } from '@ts-awesome/model-reader'

export class FreshDeskCreateGroupRequest {
  @readable(String) name!: string
  @readable(String, true) description?: string
}

export class FreshDeskGroupResponse {
  @readable(Number) id!: number
  @readable(String, true) name?: string
  @readable(String, true) description?: string
  @readable(String, true) created_at?: string
  @readable(String, true) updated_at?: string
}

class FreshDeskGroupWrapperResponse {
  @readable(FreshDeskGroupResponse) group!: FreshDeskGroupResponse
}

export interface IFreshdeskConfigurationService {
  createGroup(payload: FreshDeskCreateGroupRequest): Promise<FreshDeskGroupResponse>
}

export const FreshdeskConfigurationServiceSymbol = Symbol.for('IFreshdeskConfigurationService')

@injectable()
export class FreshdeskConfigurationService implements IFreshdeskConfigurationService {
  private logger: ILogger

  @named('freshdesk')
  @inject(HttpTransportSymbol)
  http!: IHttpTransport

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(FreshdeskConfigurationService)
  }

  async createGroup(payload: FreshDeskCreateGroupRequest): Promise<FreshDeskGroupResponse> {
    try {
      const body = { group: { ...payload } }
      const group = await this.http.post('/groups.json', { body, Model: FreshDeskGroupWrapperResponse })

      return group.group
    } catch (err) {
      throw new FreshdeskError(err)
    }
  }
}

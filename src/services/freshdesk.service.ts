2021

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { inject, injectable, named } from 'inversify'
// @ts-ignore
import Freshdesk from '@freshworks/freshdesk'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { IFreshdeskConfig, FreshdeskConfigSymbol } from '../models/config'

import {
  IOrderHelpdeskTicketEntityService,
  IUserBankAccountEntityService,
  IUserDetailsEntityService,
  OrderHelpdeskTicketEntityServiceSymbol,
  UserBankAccountEntityServiceSymbol,
  UserDetailsEntityServiceSymbol,
} from '../models/db'
import {
  FreshdeskError,
  IUpdateTicketInput,
  ICreateNoteInput,
  ITicketOutput,
  ICreateTicketInput,
  CreateSupportTicketInput,
} from '../models/freshdesk'
import { HttpTransportSymbol, IHttpTransport } from '@ts-awesome/request'
import { EmailConfigOutput } from '../models/freshdesk/email-configs'
import { cache, CacheKey } from '../utils/cache-util'

export interface IFreshdeskService {
  getTicket(ticketId: string): Promise<ITicketOutput>
  createTicket(fields: ICreateTicketInput): Promise<any>
  updateTicket(ticketId: string, payload: IUpdateTicketInput): Promise<void>
  createNote(ticketId: string, payload: ICreateNoteInput, internal?: true): Promise<void>

  createSupportTicket(fields: CreateSupportTicketInput): Promise<void>
}

export const FreshdeskServiceSymbol = Symbol.for('IFreshdeskService')

@injectable()
export class FreshdeskService implements IFreshdeskService {
  private readonly logger: ILogger
  private readonly freshdesk: Freshdesk

  @named('freshdesk') @inject(HttpTransportSymbol) http!: IHttpTransport

  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountEntityService!: IUserBankAccountEntityService
  @inject(OrderHelpdeskTicketEntityServiceSymbol) orderHelpdeskTicketEntityService!: IOrderHelpdeskTicketEntityService

  constructor(
    @inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory,
    @inject(FreshdeskConfigSymbol) config: IFreshdeskConfig,
  ) {
    this.logger = loggerFactory(FreshdeskService)
    this.freshdesk = new Freshdesk({ domain: config.url, api_key: config.key })
  }

  async getTicket(ticketId: string): Promise<ITicketOutput> {
    try {
      const ticket = await this.freshdesk.tickets.getTicket(ticketId)

      return ticket.data
    } catch (err) {
      throw new FreshdeskError(err)
    }
  }

  async createTicket(fields: ICreateTicketInput): Promise<any> {
    try {
      const ticket = await this.freshdesk.tickets.createTicket(fields)

      this.logger.info(`Created FreshDesk ticket for ${fields.subject}`)

      return ticket.data
    } catch (err) {
      throw new FreshdeskError(err)
    }
  }

  async updateTicket(ticketId: string, payload: IUpdateTicketInput): Promise<void> {
    try {
      await this.freshdesk.tickets.updateTicket(ticketId, { ...payload })
    } catch (err) {
      throw new FreshdeskError(err)
    }
  }

  async createNote(ticketId: string, payload: ICreateNoteInput, internal?: true): Promise<void> {
    try {
      await this.freshdesk.tickets.addNotes(ticketId, { ...payload, private: !!internal })
    } catch (err) {
      throw new FreshdeskError(err)
    }
  }

  async createSupportTicket(fields: CreateSupportTicketInput): Promise<void> {
    const configs = await this.getEmailConfigs()
    const primaryEmail = configs.find(x => x.primaryRole)

    if (!primaryEmail) {
      return
    }

    try {
      const body = {
        ...fields,
        email_config_id: primaryEmail.id,
      }

      await this.freshdesk.tickets.createTicket(body)

      this.logger.info(`Created FreshDesk Support ticket for issue with title "${fields.subject}"`)
    } catch (err) {
      throw new FreshdeskError(err)
    }
  }

  @cache(CacheKey.FreshdeskEmailConfig)
  private async getEmailConfigs(): Promise<EmailConfigOutput[]> {
    try {
      return await this.http.get<EmailConfigOutput[]>('/api/v2/email_configs', { Model: [EmailConfigOutput] })
    } catch (err) {
      this.logger.error(err as Error)
      return []
    }
  }
}

2021

import { inject, injectable, named } from 'inversify'
import { HttpTransportSymbol, IHttpTransport } from '@ts-awesome/request'
import { ITicketRequest } from '../models/zendesk/ticket.request'

export interface IZendeskService {
  createTicket(ticket: ITicketRequest): Promise<void>
}

export const ZendeskServiceSymbol = Symbol.for('IZendeskService')

@injectable()
export class ZendeskService implements IZendeskService {
  @named('zendesk') @inject(HttpTransportSymbol) http!: IHttpTransport

  async createTicket(ticket: ITicketRequest): Promise<void> {
    await this.http.post('/api/v2/tickets', { body: { ticket } })
  }
}

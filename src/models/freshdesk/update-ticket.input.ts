2021

import { FreshdeskTicketPriority, FreshdeskTicketStatus } from './common'

export interface IUpdateTicketInput {
  description?: string
  subject?: string
  custom_fields?: Record<string, unknown>
  email?: string
  requester_id?: number
  status?: FreshdeskTicketStatus
  priority?: FreshdeskTicketPriority
  type?: string
  group_id?: number
  responder_id?: number
  product_id?: number
}

2021

import { FreshdeskTicketPriority, FreshdeskTicketStatus } from './common'

export class ICreateTicketInput {
  subject!: string
  description!: string
  type!: string
  email!: string
  priority!: FreshdeskTicketPriority
  status!: FreshdeskTicketStatus
  group_id!: number
  custom_fields!: any
}

export class CreateSupportTicketInput {
  name?: string | null
  email!: string
  subject!: string
  status!: FreshdeskTicketStatus
  priority!: FreshdeskTicketPriority
  description!: string
}

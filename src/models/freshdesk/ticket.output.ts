2021

import { FreshdeskTicketPriority, FreshdeskTicketStatus } from './common'

export interface ITicketOutput {
  cc_emails?: string[]
  fwd_emails?: string[]
  reply_cc_emails?: string[]
  group_id?: number
  priority?: FreshdeskTicketPriority
  requester_id?: number
  responder_id?: number
  description?: string
  custom_fields?: any
  status?: FreshdeskTicketStatus
  subject?: string
  id?: number
  type?: string
  //email_config_id?: null,
  //"fr_escalated" : false,
  //"source" : 2,
  //"spam" : false,
  //"company_id" : 1,
  //"to_emails" : null,
  //"product_id" : null,
  //"created_at" : "2015-08-24T11:56:51Z",
  //"updated_at" : "2015-08-24T11:59:05Z",
  //"due_by" : "2015-08-27T11:30:00Z",
  //"fr_due_by" : "2015-08-25T11:30:00Z",
  //"is_escalated" : false,
  //"association_type" : null,
  //"description_text" : "Not given.",
  //"tags" : [ ],
  //"attachments" : [ ]
}

import { MailTemplates } from '../../../services/mailer/mailgun.service'

export interface IMailTemplate {
  name: MailTemplates
  variables: Record<string, string | number | boolean>
  conditionalContent: Record<string, boolean>
}

export interface IMessage {
  from?: string
  to: string
  subject: string
  text?: string
  html?: string
  template: IMailTemplate
  params?: Record<string, string | number | boolean | unknown>
}

export enum MailerProvider {
  Console = 'console',
  SMTP = 'smtp',
  Mailgun = 'mailgun',
  // ...
}

export interface IMailerService {
  send(payload: IMessage): Promise<void>
}

export const MailerServiceSymbol = Symbol.for('IMailerService')

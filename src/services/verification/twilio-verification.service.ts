2021

import { injectable } from 'inversify'
import { Twilio } from 'twilio'

import { IEmailPayload, IVerificationService } from './verification.service'
import { ITwilioConfig } from '../../lib/models/config'

@injectable()
export class TwilioVerificationService implements IVerificationService {
  constructor(private readonly instance: Twilio, private readonly config: ITwilioConfig) {}

  async sendByCall(phone: string): Promise<void> {
    throw new Error('Sending verification by call is not implemented yet')
  }

  async verifyByCall(phone: string, code: string): Promise<void> {
    throw new Error('Verification by call is not implemented yet')
  }

  async sendByEmail(payload: IEmailPayload): Promise<void> {}

  async verifyByEmail(email: string, code: string): Promise<void> {}

  async sendBySMS(phone: string): Promise<void> {}

  async verifyBySMS(phone: string, code: string, whatsapp?: boolean): Promise<void> {}

  async sendByWhatsApp(phone: string): Promise<void> {}

  async verifyByWhatsApp(phone: string, code: string): Promise<void> {}
}

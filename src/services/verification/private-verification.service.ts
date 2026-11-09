2021

import { inject, injectable } from 'inversify'
import crypto from 'crypto'
import { RequestError } from '@ts-awesome/rest'

import { IEmailPayload, IVerificationService } from './verification.service'
import { IMailerService, MailerServiceSymbol } from '../../lib/services/mailer'
import { ISMSService, SMSServiceSymbol } from '../sms'
import { IKeyValueStorageService, KeyValueStorageServiceSymbol } from '../../lib/services/key-value-storage'
import { BadRequestError } from '../../errors'
import { MailTemplates } from '../mailer/mailgun.service'

@injectable()
export class PrivateVerificationService implements IVerificationService {
  @inject(KeyValueStorageServiceSymbol) keyValueStorage!: IKeyValueStorageService
  @inject(MailerServiceSymbol) mailer!: IMailerService
  @inject(SMSServiceSymbol) sms!: ISMSService

  async sendByCall(phone: string): Promise<void> {
    throw new Error('Sending verification by call is not implemented yet')
  }

  async verifyByCall(phone: string, code: string): Promise<void> {
    throw new Error('Verification by call is not implemented yet')
  }

  async sendByEmail(payload: IEmailPayload): Promise<void> {
    const code = await this.generateCode(payload.email)

    await this.mailer.send({
      to: payload.email,
      subject: 'Neobank Verification Code',
      template: {
        name: MailTemplates.VerificationCode,
        variables: {
          code: code,
        },
        conditionalContent: {},
      },
    })
  }

  async verifyByEmail(email: string, code: string): Promise<void> {
    await this.verifyCode(email, code)
  }

  async sendBySMS(phone: string, codeLength: number, whatsapp?: boolean): Promise<void> {
    const code = await this.generateCode(`phone_verification:${phone}`, codeLength)

    await this.sms.send(
      phone,
      `Neobank App: Your verification code is ${code}. Code expires in 5 minutes.
Please do not share this code with anyone.`,
      whatsapp,
    )
  }

  async verifyBySMS(phone: string, code: string): Promise<void> {
    await this.verifyCode(`phone_verification:${phone}`, code)
  }

  private async generateCode(key: string, length: number = 5) {
    const maxCodeValue = Math.pow(10, length) - 1

    key = key.replace(/[ ]*/g, '')
    const code = crypto.randomInt(0, maxCodeValue).toString().padStart(length, '0')

    await this.keyValueStorage.set(key, code)

    return code
  }

  private async verifyCode(key: string, code: string) {
    const sentCode = await this.keyValueStorage.get(key)

    if (!sentCode) {
      throw new RequestError('Code expired', 'Gone', 410)
    }

    if (sentCode !== code) {
      throw new BadRequestError('Invalid code')
    }

    await this.keyValueStorage.delete(key)
  }
}

2021

import { injectable } from 'inversify'

import { IEmailPayload, IVerificationService } from './verification.service'
import { BadRequestError } from '../../errors'

const VerificationCode5 = '11111'
const VerificationCode6 = '111111'

@injectable()
export class HardcodedVerificationService implements IVerificationService {
  async sendByCall(phone: string): Promise<void> {}

  async verifyByCall(phone: string, code: string): Promise<void> {
    this.verifyCode(code)
  }

  async sendByEmail(payload: IEmailPayload): Promise<void> {}

  async verifyByEmail(email: string, code: string): Promise<void> {
    this.verifyCode(code)
  }

  async sendBySMS(phone: string, size: number, whatsapp?: boolean): Promise<void> {}

  async verifyBySMS(phone: string, code: string): Promise<void> {
    this.verifyCode(code)
  }

  private verifyCode(code: string) {
    if (VerificationCode5 !== code && VerificationCode6 !== code) {
      throw new BadRequestError('Invalid code')
    }
  }
}

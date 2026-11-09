import { inject, injectable } from 'inversify'
import twilio, { Twilio } from 'twilio'

import { ISMSService } from '../../../services/sms'
import { ITwilioConfig, TwilioConfigSymbol } from '../../models/config'
import { ILogger, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'

@injectable()
export class TwilioService implements ISMSService {
  private readonly instance: Twilio
  private readonly logger: ILogger

  constructor(
    @inject(TwilioConfigSymbol) readonly config: ITwilioConfig,
    @inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory,
  ) {
    this.logger = loggerFactory(TwilioService)

    const { accountSid, authToken } = config
    this.instance = twilio(accountSid, authToken)
  }

  async send(phone: string, text: string, whatsapp?: boolean): Promise<void> {
    // this.logger.debug(`Sending SMS text:${text} to phone:${phone}`)

    await this.instance.messages.create({
      body: text,
      to: whatsapp ? `whatsapp:${phone}` : phone,
      from: whatsapp ? `whatsapp:${this.config.whatsappPhone}` : this.config.phone,
    })
  }
}

2021

import { injectable } from 'inversify'
import { ISMSService } from './sms.service'

@injectable()
export class ConsoleSMSService implements ISMSService {
  async send(phone: string, text: string, whatsapp?: boolean): Promise<void> {
    // eslint-disable-next-line no-console
    console.info(`Send sms to ${phone} with text: ${text}. whatsapp:${whatsapp}`)
  }
}

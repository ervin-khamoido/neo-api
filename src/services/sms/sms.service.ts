2021

export const SMSServiceSymbol = Symbol.for('ISMSService')

export enum SMSProvider {
  Console = 'console',
  Twilio = 'twilio',
}

export interface ISMSService {
  send(phone: string, text: string, whatsapp?: boolean): Promise<void>
}

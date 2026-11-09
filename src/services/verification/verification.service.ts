2021

export enum VerificationProvider {
  Self = 'self',
  Twilio = 'twilio',
  Hardcoded = 'hardcoded',
}

export const VerificationServiceSymbol = Symbol.for('IVerificationService')

export interface IVerificationService {
  sendBySMS(phone: string, size: number, whatsapp?: boolean): Promise<void>
  verifyBySMS(phone: string, code: string): Promise<void>

  sendByCall(phone: string): Promise<void>
  verifyByCall(phone: string, code: string): Promise<void>

  sendByEmail(payload: IEmailPayload): Promise<void>
  verifyByEmail(email: string, code: string): Promise<void>
}

export interface IEmailPayload {
  email: string

  // from: string
  // fromName: string

  templateId?: string
  params?: Record<string, unknown>
}

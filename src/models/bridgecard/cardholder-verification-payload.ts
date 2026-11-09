2023

export interface ICardHolderVerificationPayload {
  cardholder_id: string
  is_active: boolean
  livemode: boolean
  issuing_app_id: string
  error_description?: string
}

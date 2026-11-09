export interface IAddressConfirmationPayload {
  type: 'address_confirmation'
  hash: string
  walletId: string
  address: string
}

export enum BitGoTransferState {
  Confirmed = 'confirmed',
  Failed = 'failed',
}

export interface ITransferPayload {
  type: 'transfer'
  hash: string
  wallet: string
  transfer: string
  coin: string
  state: BitGoTransferState
}

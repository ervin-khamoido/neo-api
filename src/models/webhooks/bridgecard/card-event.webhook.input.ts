2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import {
  ICardCreationPayload,
  ICardCreditPayload,
  ICardDebitSuccessPayload,
  ICardDebitDeclinedPayload,
  ICardHolderVerificationPayload,
} from '../../bridgecard'
import { ICardReversalPayload } from '../../bridgecard/card-reversal-payload'

export enum CardEventType {
  SuccessfulCardHolderVerification = 'cardholder_verification.successful',
  FailedCardHolderVerification = 'cardholder_verification.failed',
  SuccessfulCardCreation = 'card_creation_event.successful',
  FailedCardCreation = 'card_creation_event.failed',

  // card credited
  SuccessfulCardCredit = 'card_credit_event.successful',
  FailedCardCredit = 'card_credit_event.failed',

  // card debit
  SuccessfulCardDebit = 'card_debit_event.successful',
  DeclinedCardDebit = 'card_debit_event.declined',

  // card reversal
  SuccessfulCardReversal = 'card_reversal_event.successful',
}

export type CardEventData =
  | ICardHolderVerificationPayload
  | ICardCreationPayload
  | ICardCreditPayload
  | ICardDebitSuccessPayload
  | ICardDebitDeclinedPayload
  | ICardReversalPayload

@OpenApiSchema({
  description: 'BridgeCard card events input model',
})
export class CardEventWebhookInput {
  @OpenApiSchemaProperty({
    description: 'Event type aka the event name from BridgeCard',
    writeOnly: true,
  })
  @readable
  event!: CardEventType

  @OpenApiSchemaProperty({
    description: 'The relevant event data from Bridgecard',
    writeOnly: true,
  })
  @readable(Object)
  data!: CardEventData
}

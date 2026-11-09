2023

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'

import { CardEventType, CardEventWebhookInput } from '../../models/webhooks/bridgecard'
import {
  ICardCreationPayload,
  ICardCreditPayload,
  ICardDebitDeclinedPayload,
  ICardDebitSuccessPayload,
  ICardHolderVerificationPayload,
} from '../../models/bridgecard'
import { ICardReversalPayload } from '../../models/bridgecard/card-reversal-payload'
import {
  CardOrderEntityServiceSymbol,
  CardOrderType,
  CardStatus,
  ICardOrderEntityService,
  IUserCardEntityService,
  IUserCardHolderEntityService,
  UserCardEntityServiceSymbol,
  UserCardHolderEntityServiceSymbol,
} from '../../models/db'

import { CardServiceSymbol, ICardService } from '../dumb/card/card.service'
import {
  CardNotificationServiceSymbol,
  ICardNotificationService,
} from '../dumb/card/notifications/card-notification.service'
import { IUserBalanceService, UserBalanceServiceSymbol } from '../user-balance.service'

export interface IBridgeCardWebhookService {
  processCardEvent(payload: CardEventWebhookInput): Promise<void>
}

export const BridgeCardWebhookServiceSymbol = Symbol.for('IBridgeCardWebhookService')

@injectable()
export class BridgeCardWebhookService implements IBridgeCardWebhookService {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(UserCardHolderEntityServiceSymbol) userCardHolderEntityService!: IUserCardHolderEntityService
  @inject(UserCardEntityServiceSymbol) userCardService!: IUserCardEntityService
  @inject(CardOrderEntityServiceSymbol) cardOrderService!: ICardOrderEntityService

  @inject(CardServiceSymbol) cardService!: ICardService
  @inject(CardNotificationServiceSymbol) cardNotificationService!: ICardNotificationService
  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(BridgeCardWebhookService)
  }

  async processCardEvent(payload: CardEventWebhookInput): Promise<void> {
    const { event, data } = payload

    this.logger.info(`Processing card event for cardholder ID ${data.cardholder_id} and event type ${event}`)

    switch (event) {
      case CardEventType.SuccessfulCardHolderVerification: {
        await this.handleCardholderSuccess(<ICardHolderVerificationPayload>data)
        break
      }
      case CardEventType.FailedCardHolderVerification: {
        await this.handleCardholderFailure(<ICardHolderVerificationPayload>data)
        break
      }
      case CardEventType.SuccessfulCardCreation: {
        await this.handleCardSuccess(<ICardCreationPayload>data)
        break
      }
      case CardEventType.FailedCardCreation: {
        await this.handleCardFailure(<ICardCreationPayload>data)
        break
      }
      case CardEventType.SuccessfulCardCredit: {
        await this.handleCardCreditSuccess(<ICardCreditPayload>data)
        break
      }
      case CardEventType.FailedCardCredit: {
        await this.handleCardCreditFailure(<ICardCreditPayload>data)
        break
      }
      case CardEventType.SuccessfulCardDebit: {
        await this.handleCardDebitSuccess(<ICardDebitSuccessPayload>data)
        break
      }
      case CardEventType.DeclinedCardDebit: {
        await this.handleCardDebitDeclined(<ICardDebitDeclinedPayload>data)
        break
      }
      case CardEventType.SuccessfulCardReversal: {
        await this.handleCardReversalSuccess(<ICardReversalPayload>data)
        break
      }
      default: {
        throw new Error(`unexpected: received unsupported event type ${event}`)
      }
    }

    this.logger.info(`Completed processing card event for cardholder ID ${data.cardholder_id} and event type ${event}`)
  }

  private async handleCardholderSuccess(payload: ICardHolderVerificationPayload) {
    // handle cardholder success webhook
    await this.uow.auto(() => this.cardService.onCardHolderSuccess(payload.cardholder_id, payload))

    // trigger card creation after the successful webhook
    await this.uow.auto(async () => {
      // we must acquire a lock on this record
      const cardholder = await this.userCardHolderEntityService.getForUpdateByProviderCardHolderId(
        payload.cardholder_id,
      )
      if (!cardholder) {
        throw new Error(`unexpected: cardholder ${payload.cardholder_id} is not found`)
      }

      try {
        await this.cardService.createCard(cardholder.userId)
      } catch (err: any) {
        this.logger.error(`Failed to create a card for cardholder ID ${payload.cardholder_id}`)
        this.logger.error(err)
      }
    })

    // notify cardholder about updates
    await this.notifyByCardHolder(payload.cardholder_id)
  }

  private async handleCardholderFailure(payload: ICardHolderVerificationPayload) {
    // handle cardholder failure webhook
    await this.uow.auto(() => this.cardService.onCardHolderFailure(payload.cardholder_id, payload))

    // notify cardholder about updates
    await this.notifyByCardHolder(payload.cardholder_id)
  }

  private async handleCardSuccess(payload: ICardCreationPayload): Promise<void> {
    // handle card success webhook
    const userCardId = await this.uow.auto(async () => {
      // we must acquire a lock on this record
      const cardholder = await this.userCardHolderEntityService.getForUpdateByProviderCardHolderId(
        payload.cardholder_id,
      )
      if (!cardholder) {
        throw new Error(`unexpected: cardholder ${payload.cardholder_id} is not found`)
      }

      return this.cardService.onCardSuccess(payload.card_id, payload)
    })

    // notify cardholder about updates
    await Promise.all([
      this.notifyByCardHolder(payload.cardholder_id),
      this.notifyBalanceByCardHolder(payload.cardholder_id),
    ])

    const userCard = await this.userCardService.getOne({ id: userCardId })
    if (!userCard) {
      this.logger.error(`unexpected: user card does not exist for user card ID ${userCardId}`)
      throw new Error(`User card does not exist`)
    }

    if (userCard.status !== CardStatus.CardIssued) {
      this.logger.error(
        `critical: successful card event failed to issue virtual card for user ID ${userCard.userId} and card ID ${userCardId}`,
      )
      throw new Error(`User card was not issued successfully`)
    }

    // notify user about card creation
    await this.cardNotificationService.notifyCreationViaPush(userCardId)
  }

  private async handleCardFailure(payload: ICardCreationPayload): Promise<void> {
    // handle card failure webhook
    await this.uow.auto(async () => {
      // we must acquire a lock on this record
      const cardholder = await this.userCardHolderEntityService.getForUpdateByProviderCardHolderId(
        payload.cardholder_id,
      )
      if (!cardholder) {
        throw new Error(`unexpected: cardholder ${payload.cardholder_id} is not found`)
      }

      await this.cardService.onCardFailure(payload.card_id, payload)
    })

    // notify cardholder about updates
    await this.notifyByCardHolder(payload.cardholder_id)
  }

  private async handleCardCreditSuccess(payload: ICardCreditPayload): Promise<void> {
    this.logger.info(`Starting processing card credit success. Provider card id: ${payload.card_id}`)

    const orderId = await this.uow.auto(() => this.cardService.onCardCreditSuccess(payload))

    await Promise.all([
      await this.notifyBalanceByCardHolder(payload.cardholder_id),
      await this.notifyCardBalanceByCardHolder(payload.cardholder_id),
    ])

    // notify user about fund/top-up/credit
    await Promise.all([
      this.cardNotificationService.notifyTopUpViaPush(orderId),
      this.cardNotificationService.notifyTopUpViaEmail(orderId),
    ])
  }

  private async handleCardCreditFailure(payload: ICardCreditPayload): Promise<void> {
    this.logger.info(`Starting processing card credit failure. Provider card id: ${payload.card_id}`)

    await this.uow.auto(() => this.cardService.onCardCreditFailed(payload))
  }

  private async handleCardDebitSuccess(payload: ICardDebitSuccessPayload): Promise<void> {
    this.logger.info(`Starting processing card debit success. Provider card id: ${payload.card_id}`)

    const orderId = await this.uow.auto(() => this.cardService.onCardDebitSuccess(payload))

    await this.notifyCardBalanceByCardHolder(payload.cardholder_id)

    // notify user about fund/top-up/credit
    const cardOrder = await this.cardOrderService.getOne({ orderId: orderId })
    if (cardOrder?.type === CardOrderType.Spend) {
      await Promise.all([
        this.cardNotificationService.notifySpendViaPush(orderId),
        this.cardNotificationService.notifySpendViaEmail(orderId),
      ])
    }

    if (cardOrder?.type === CardOrderType.Unload) {
      await this.notifyBalanceByCardHolder(payload.cardholder_id)
    }
  }

  private async handleCardDebitDeclined(payload: ICardDebitDeclinedPayload): Promise<void> {
    this.logger.warn(`Starting processing card declined debit. Provider card id: ${payload.card_id}`)

    await this.uow.auto(() => this.cardService.onCardDebitDeclined(payload))
  }

  private async handleCardReversalSuccess(payload: ICardReversalPayload): Promise<void> {
    this.logger.warn(`Starting processing card reversal success. Provider card id: ${payload.card_id}`)

    await this.uow.auto(() => this.cardService.onCardReversalSuccess(payload))

    await this.notifyCardBalanceByCardHolder(payload.cardholder_id)
  }

  private async notifyByCardHolder(providerCardHolderId: string): Promise<void> {
    const cardholder = await this.userCardHolderEntityService.getOne({ providerCardHolderId })
    if (!cardholder) {
      throw new Error(`unexpected: cardholder ${providerCardHolderId} is not found`)
    }

    await this.cardService.notifyCardUpdate(cardholder.userId)
  }

  private async notifyBalanceByCardHolder(providerCardHolderId: string): Promise<void> {
    const cardholder = await this.userCardHolderEntityService.getOne({ providerCardHolderId })
    if (!cardholder) {
      throw new Error(`unexpected: cardholder ${providerCardHolderId} is not found`)
    }

    await this.userBalanceService.notifyUserBalance(cardholder.userId)
  }

  private async notifyCardBalanceByCardHolder(providerCardHolderId: string): Promise<void> {
    const cardholder = await this.userCardHolderEntityService.getOne({ providerCardHolderId })
    if (!cardholder) {
      throw new Error(`unexpected: cardholder ${providerCardHolderId} is not found`)
    }

    await this.userBalanceService.notifyUserCardBalance(cardholder.userId)
  }
}

2023

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { NotFoundError } from '@ts-awesome/rest'

import { isNil } from 'lodash'
import { firestore } from 'firebase-admin'
import currency from 'currency.js'

import { States } from '../../../utils/country-state-city/states'

import {
  CardHolderStatus,
  CardHolderStatusToCardStatus,
  CardOrderEntityServiceSymbol,
  CardOrderStatus,
  CardOrderType,
  CardStatus,
  CountryCodeToCountryName,
  ICardOrderEntityService,
  IOrderStatusEntityService,
  IUserCardEntityService,
  IUserCardHolderEntityService,
  IUserDetailsEntityService,
  IUserEntityService,
  OrderModel,
  OrderStatusEntityServiceSymbol,
  TransactionModel,
  TransactionStatus,
  UserCardEntityServiceSymbol,
  UserCardHolderEntityServiceSymbol,
  UserCardModel,
  UserDetailsEntityServiceSymbol,
  UserEntityServiceSymbol,
} from '../../../models/db'
import {
  CardCurrency,
  CardTransactionInfo,
  CardTransactionType,
  CardType,
  CreateCardHolderRequest,
  CreateCardRequest,
  ICardCreationPayload,
  ICardCreditPayload,
  ICardDebitDeclinedPayload,
  ICardDebitSuccessPayload,
  ICardHolderVerificationPayload,
  ICardTransaction,
  IdType,
  IFundCardResult,
} from '../../../models/bridgecard'
import { CardDetailsOutput } from '../../../models/response'
import { IdDocType } from '../../../models/sumsub/applicant-status.response'
import { ICardReversalPayload } from '../../../models/bridgecard/card-reversal-payload'
import { UnloadCardInfo } from '../../../models/bridgecard'
import { BridgeCardConfigSymbol, IBridgeCardConfig } from '../../../models/config'

import { BridgeCardServiceSymbol, IBridgeCardService } from './bridgecard.service'
import { IUserLevelService, UserLevelServiceSymbol } from '../../level/user-level.service'
import { IModernTreasuryService, ModernTreasuryServiceSymbol } from '../../modern-treasury.service'
import { CardOrderServiceSymbol, ICardOrderService } from './card-order/card-order.service'
import { CardOrderStatusServiceSymbol, ICardOrderStatusService } from './card-order/co-status.service'
import { ITransactionStatusService, TransactionStatusServiceSymbol } from '../../transaction/transaction-status.service'
import { ITransactionServiceV2, TransactionServiceV2Symbol } from '../transaction/transaction.service.v2'
import { COActivityServiceSymbol, ICOActivityService } from './card-activity/co-activity.service'
import { FeeServiceSymbol, IFeeService } from '../../fee.service'
import { IWalletService, WalletServiceSymbol } from '../../wallet.service'
import { USDC_CURRENCY } from '../../../utils/calculator-utils'

export enum CardProvider {
  BridgeCard = 'bridgecard',
}

export interface ICardService {
  /**
   * Gets the user's virtual card record from DB. It returns the references
   * to the provider's data and current status.
   *
   * @param userId The user's ID in DB.
   * @returns {UserCardModel} the user's card
   * @throws {NotFoundError} if the virtual card is not found
   */
  getUserCard(userId: number): Promise<UserCardModel>

  /**
   * Gets the user's virtual card details from a provider. The method returns cvv,
   * card number, expiry date, etc.
   *
   * @param userId The user's ID in DB.
   * @returns {CardDetailsOutput} the user's card
   * @throws {NotFoundError} if the virtual card is not found in DB or the provider's API throws.
   */
  getCardDetails(userId: number): Promise<CardDetailsOutput>

  /**
   * Gets the user's virtual card status from the DB. If the card does not exist
   * the method returns CardStatus.CardNotIssued.
   *
   * @param userId The user's ID in DB.
   * @returns {CardDetailsOutput} the user's card
   */
  getCardStatus(userId: number): Promise<CardStatus>

  /**
   * Gets the card transaction from the provider.
   *
   * @param providerCardId The user's ID in DB.
   * @param transactionReference The user's ID in DB.
   * @returns {ICardTransaction} the card transaction.
   * @throws {NotFoundError} if the transaction is not found in DB or the provider's API throws.
   */
  getCardTransaction(providerCardId: string, transactionReference: string): Promise<ICardTransaction>

  /**
   * BridgeCard accepts amounts only as integer value in cents. The method
   * converts the decimal amount in dollars to integer amount in cents.
   *
   * @param amount The decimal amount in dollars
   * @returns {string}  The integer amount in cents as a string
   */
  convertToBridgecardAmount(amount: number): string

  /**
   * BridgeCard accepts amounts only as integer value in cents. The method
   * converts the integer amount in cents to the decimal amount in dollars.
   *
   * @param amount The integer amount in dollars as a string
   * @returns {string} The decimal amount in dollars as a number
   */
  convertFromBridgecardAmount(amount: string): number

  /**
   * BridgeCard supports only 2 digits after the decimal point. The method checks
   * if the value contains no more than 2 decimal places.
   *
   * @param amount The integer amount in dollars as a string.
   * @returns {boolean} true if valid, otherwise false.
   */
  validateUSDAmount(amount: number): boolean

  createVirtualCardHolder(userId: number, payload: CardholderPayload): Promise<void>
  onCardHolderSuccess(providerCardHolderId: string, payload: ICardHolderVerificationPayload): Promise<void>
  onCardHolderFailure(providerCardHolderId: string, payload: ICardHolderVerificationPayload): Promise<void>

  createCard(userId: number, forceIssueCostZero?: boolean): Promise<void>

  /**
   * Moves the card status to "Issued" and saves public card details from the provider.
   *
   * @param providerCardId The ID of the card in the provider's system.
   * @param payload The payload sent by a provider.
   * @returns {number} User Card ID updated in DB.
   */
  onCardSuccess(providerCardId: string, payload: ICardCreationPayload): Promise<number>

  /**
   * Moves the card status to "CardIssueFailure" and saves the error details.
   *
   * @param providerCardId The ID of the card in the provider's system.
   * @param payload The payload sent by a provider.
   * @returns {number} User Card ID updated in DB.
   */
  onCardFailure(providerCardId: string, payload: ICardCreationPayload): Promise<number>

  /**
   * Freezes a user's virtual card by user ID and card ID.
   * @param userId The user ID
   * @param card The card ID
   * @param reason The reason for freezing the card.
   */
  freezeCard(userId: number, cardId: number, reason?: string): Promise<void>

  /**
   * Unfreezes a user's virtual card by user ID and card ID.
   * @param userId The user ID
   * @param cardId The card ID
   * @param reason The reason for unfreezing the card.
   */
  unfreezeCard(userId: number, cardId: number, reason?: string): Promise<void>

  /**
   * Freezes all active virtual cards for a user by user ID.
   * @param userId The user ID
   * @param reason The reason for freezing the user's cards.
   */
  freezeActiveCards(userId: number, reason?: string): Promise<void>

  /**
   * Unfreezes all frozen virtual cards for a user by user ID.
   * @param userId The user ID
   */
  unfreezeActiveCards(userId: number): Promise<void>

  deleteCardHolder(userId: number): Promise<void>

  /**
   * Funds the user's virtual card with a specified decimal amount in dollars.
   *
   * @param userId The user whose card status/details has changed.
   * @param amount The amount
   * @returns {number} Order ID created in DB.
   */
  fundCard(userId: number, amount: number): Promise<number>

  /**
   * Finalize with "complete" status the Fund order in the DB, and transaction.
   *
   * @param payload The payload sent by a provider.
   * @returns {number} Order ID updated in DB.
   */
  onCardCreditSuccess(payload: ICardCreditPayload): Promise<number>

  /**
   * Finalize with "failed" status the Fund order in the DB, and transaction.
   *
   * @param payload The payload sent by a provider.
   * @returns {number} Order ID updated in DB.
   */
  onCardCreditFailed(payload: ICardCreditPayload): Promise<number>

  /**
   * Creates the completed Card->Spend order in the DB with a completed transaction and activity.
   *
   * @param payload The payload sent by a provider.
   * @returns {number} Order ID updated in DB.
   */
  onCardDebitSuccess(payload: ICardDebitSuccessPayload): Promise<number>

  /**
   * Creates the failed Card->Spend order in the DB with a failed transaction (in MT archived) and activity.
   *0
   * @param payload The payload sent by a provider.
   * @returns {number} Order ID updated in DB.
   */
  onCardDebitDeclined(payload: ICardDebitDeclinedPayload): Promise<number>

  onCardReversalSuccess(payload: ICardReversalPayload): Promise<void>

  unloadCard(userId: number, amount: number): Promise<void>

  /**
   * Updates the version of the card status/details in Firestore. All subscribers
   * will be notified about changes.
   *
   * @param userId The user whose card status/details has changed.
   */
  notifyCardUpdate(userId: number): Promise<void>

  getCardIssueCosts(): Promise<CardIssueCosts>
}

export const CardServiceSymbol = Symbol.for('ICardService')

@injectable()
export class CardService implements ICardService {
  @inject(BridgeCardConfigSymbol) bridgeCardConfig!: IBridgeCardConfig

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserCardEntityServiceSymbol) userCardEntityService!: IUserCardEntityService
  @inject(UserCardHolderEntityServiceSymbol) userCardHolderEntityService!: IUserCardHolderEntityService
  @inject(CardOrderEntityServiceSymbol) cardOrderEntityService!: ICardOrderEntityService
  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService

  @inject(BridgeCardServiceSymbol) bridgeCardService!: IBridgeCardService
  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService
  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService
  @inject(CardOrderServiceSymbol) cardOrderService!: ICardOrderService
  @inject(CardOrderStatusServiceSymbol) cardOrderStatusService!: ICardOrderStatusService
  @inject(TransactionServiceV2Symbol) transactionService!: ITransactionServiceV2
  @inject(TransactionStatusServiceSymbol) transactionStatusService!: ITransactionStatusService
  @inject(COActivityServiceSymbol) coActivityService!: ICOActivityService
  @inject(FeeServiceSymbol) feeService!: IFeeService
  @inject(WalletServiceSymbol) walletService!: IWalletService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(CardService)
  }

  async getUserCard(userId: number): Promise<UserCardModel> {
    const userCard = await this.getUserCardInternal(userId)
    if (!userCard?.providerCardId) {
      throw new NotFoundError(`Virtual card is not found`)
    }

    return userCard
  }

  private async getUserCardInternal(userId: number): Promise<UserCardModel | null> {
    return this.userCardEntityService
      .select()
      .where(x => x.userId.eq(userId))
      .where(x => x.status.neq(CardStatus.CardDeleted))
      .fetchOne()
  }

  async getCardDetails(userId: number): Promise<CardDetailsOutput> {
    const userCard = await this.getUserCard(userId)

    try {
      const { data } = await this.bridgeCardService.getDecryptedCardDetails(userCard.providerCardId!)

      return {
        cardName: data.card_name,
        cardNumber: data.card_number,
        cvv: data.cvv,
        brand: data.brand,
        type: data.card_type,
        expiryMonth: data.expiry_month,
        expiryYear: data.expiry_year,
        balance: this.convertFromBridgecardAmount(data.balance ?? '0'),
        billingAddress: {
          address1: data.billing_address.billing_address1,
          country: data.billing_address.billing_country,
          city: data.billing_address.billing_city,
          zipCode: data.billing_address.billing_zip_code,
          countryCode: data.billing_address.country_code,
          state: data.billing_address.state,
        },
      }
    } catch (err: any) {
      this.logger.error(
        `critical: error received while retrieving card details for user ID ${userId} and card ID ${userCard.providerCardId}`,
      )
      this.logger.error(err)

      throw new NotFoundError(`Virtual card not found.`)
    }
  }

  async getCardStatus(userId: number): Promise<CardStatus> {
    const [userCardHolder, userCard] = await Promise.all([
      this.userCardHolderEntityService.getOne({ userId: userId }),
      this.getUserCardInternal(userId),
    ])

    // If the user is not a cardholder yet, return the card not issued status
    if (!userCardHolder) {
      return CardStatus.CardNotIssued
    }

    // If the user doesn't have a card but is a cardholder, calculate the status based on the cardholder record
    // Default to cardholder verification failure if unable to convert cardholder status (for now)
    if (!userCard) {
      return CardHolderStatusToCardStatus[userCardHolder.status] ?? CardStatus.CardHolderVerificationFailure
    }

    // Return the card status
    return userCard.status
  }

  async getCardTransaction(providerCardId: string, transactionReference: string): Promise<ICardTransaction> {
    let bcTransaction: CardTransactionInfo | undefined
    try {
      bcTransaction = await this.bridgeCardService.getCardTransaction(providerCardId, transactionReference)
    } catch (err: any) {
      this.logger.error(err)
      this.logger.error(
        `unexpected: transaction is not found in BridgeCard providerCardId:${providerCardId}, transactionReference:${transactionReference}`,
      )

      throw new NotFoundError('Card transaction is not found')
    }

    if (!bcTransaction) {
      throw new NotFoundError('Card transaction is not found')
    }

    return {
      ...bcTransaction,
      amount: this.convertFromBridgecardAmount(bcTransaction.amount),
    }
  }

  // make sure amount is entered with 2 decimal places
  validateUSDAmount(amount: number): boolean {
    return currency(amount, { precision: 10 }).multiply(100).cents() === 0
  }

  convertToBridgecardAmount(amount: number): string {
    return '' + currency(amount, { precision: 2 }).multiply(100).value
  }

  convertFromBridgecardAmount(amount: string): number {
    return currency(amount, { precision: 2 }).divide(100).value
  }

  async createVirtualCardHolder(userId: number, payload: CardholderPayload): Promise<void> {
    const [user, userDetails] = await Promise.all([
      this.userEntityService.getOne({ id: userId }),
      this.userDetailsEntityService.getOne({ userId: userId }),
    ])

    if (!user || !userDetails) {
      throw new Error('unexpected: user details not found')
    }

    const state = States.find(x => x.isoCode === userDetails.address!.state)
    if (!state) {
      throw new Error(`unexpected: state is not found for iso:${userDetails.address!.state}`)
    }

    // Needed for user cardholder records
    let identity: CreateCardHolderRequest['identity']

    if (payload.documentType === IdDocType.Selfie) {
      identity = {
        id_type: IdType.NigerianBvnVerification,
        bvn: payload.bvn,
        selfie_image: payload.documentUrl,
      }
    } else {
      const bridgeCardDocType = DocTypeMapper[payload.documentType]

      identity = {
        id_type: bridgeCardDocType,
        id_no: payload.documentNo,
        id_image: payload.documentUrl,
        bvn: payload.bvn,
      }
    }

    // NOTE: For house_no we are defaulting to a value of "1"
    // The API requires a house number to be entered, but according to Bridgecard support the Country/State are most important.
    // House number should not matter / affect user verification when creating cards in prod
    const createCardHolderRequest: CreateCardHolderRequest = {
      first_name: userDetails.firstName!,
      last_name: userDetails.lastName!,
      address: {
        address: userDetails.address!.addressLine,
        city: userDetails.address!.city,
        state: state.name,
        country: CountryCodeToCountryName[userDetails.address!.country],
        postal_code: userDetails.address!.postalCode ?? '',
        house_no: '1',
      },
      phone: userDetails.phone,
      email_address: userDetails.email,
      identity: identity,
      meta_data: {
        owner: user.uid,
      },
    }

    let providerCardHolderId = null
    let cardHolderStatus = null
    let cardHolderStatusReason = null

    try {
      // Send the create cardholder request
      providerCardHolderId = await this.bridgeCardService.createCardHolder(createCardHolderRequest)

      // If successful, set verification pending status
      cardHolderStatus = CardHolderStatus.VerificationPending
    } catch (err: any) {
      this.logger.error(
        `Failed to create cardholder for user [User ID: ${userId}] in BridgeCard. Error: ${err.message}`,
      )
      this.logger.error(err)

      // Q: Should we handle failures for fraudulent actors?
      // If failed, set failure statuses and status reasons
      cardHolderStatus = CardHolderStatus.Failure
      cardHolderStatusReason = err.message
    }

    // Create the cardholder record
    await this.userCardHolderEntityService.addOne({
      userId: userId,
      provider: CardProvider.BridgeCard,
      providerCardHolderId: providerCardHolderId,
      status: cardHolderStatus,
      statusReason: cardHolderStatusReason,
      identity: identity,
      providerPayload: null,
    })
  }

  async onCardHolderSuccess(providerCardHolderId: string, payload: ICardHolderVerificationPayload): Promise<void> {
    // verify cardholder status in bridgecard
    const cardHolderDetails = await this.bridgeCardService.getCardHolderDetails(providerCardHolderId)
    if (!cardHolderDetails.data.is_id_verified) {
      this.logger.error(
        `critical: received successful event type for user with a failed verification [cardholder ID: ${providerCardHolderId}]`,
      )

      throw new Error(`Cardholder verification failed. Cannot process verification details.`)
    }

    // fetch user cardholder
    const userCardHolder = await this.userCardHolderEntityService.getForUpdateByProviderCardHolderId(
      providerCardHolderId,
    )
    if (!userCardHolder) {
      throw new Error(`critical: user cardholder does not exist for cardholder ID ${providerCardHolderId}`)
    }

    // update records
    await this.userCardHolderEntityService.updateOne({
      userId: userCardHolder.userId,
      status: CardHolderStatus.Verified,
      statusReason: null,
      providerPayload: payload,
    })
  }

  async onCardHolderFailure(providerCardHolderId: string, payload: ICardHolderVerificationPayload): Promise<void> {
    // fetch user cardholder
    const userCardHolder = await this.userCardHolderEntityService.getForUpdateByProviderCardHolderId(
      providerCardHolderId,
    )
    if (!userCardHolder) {
      throw new Error(`critical: user cardholder does not exist for cardholder ID ${providerCardHolderId}`)
    }

    // update record
    await this.userCardHolderEntityService.updateOne({
      userId: userCardHolder.userId,
      status: CardHolderStatus.Failure,
      statusReason: payload.error_description ?? 'No error description provided from BridgeCard',
      providerPayload: payload,
    })
  }

  async onCardSuccess(providerCardId: string, payload: ICardCreationPayload): Promise<number> {
    // verify card status in bridgecard
    const cardDetails = await this.bridgeCardService.getCardDetails(providerCardId)
    if (!cardDetails.data.is_active) {
      this.logger.error(
        `critical: received successful event type for user card [card ID: ${providerCardId}] but the status is inactive`,
      )

      throw new Error(`Card verification failed. Cannot process card details.`)
    }

    // fetch user card
    const userCard = await this.userCardEntityService.getForUpdateByProviderCardId(providerCardId)
    if (!userCard) {
      throw new Error(`unexpected: user card does not exist for provider card ID ${providerCardId}`)
    }

    try {
      // Complete the fund and fee orders that were created when the virtual card was created
      await this.completeOrderIfExists(userCard.id, CardOrderType.InitialFund)
      await this.completeOrderIfExists(userCard.id, CardOrderType.Fee)

      // update record
      await this.userCardEntityService.updateOne({
        id: userCard.id,
        status: CardStatus.CardIssued,
        statusReason: null,
        providerPayload: payload,
        last4Digits: cardDetails.data.last_4,
      })
    } catch (err: any) {
      this.logger.error(
        `critical: error occurred attempting to complete initial card fund and/or fee orders for card ID ${userCard.id}`,
      )
      this.logger.error(err)

      // update record and fail order(s)
      await this.failOrderIfExists(userCard.id, CardOrderType.InitialFund)
      await this.failOrderIfExists(userCard.id, CardOrderType.Fee)

      await this.userCardEntityService.updateOne({
        id: userCard.id,
        status: CardStatus.CardIssueFailure,
        statusReason: 'Failed to complete the initial funding and fee transactions.',
        providerPayload: payload,
        last4Digits: cardDetails.data.last_4,
      })
    }

    return userCard.id
  }

  async onCardFailure(providerCardId: string, payload: ICardCreationPayload): Promise<number> {
    // fetch user card
    const userCard = await this.userCardEntityService.getForUpdateByProviderCardId(providerCardId)
    if (!userCard) {
      throw new Error(`unexpected: user card does not exist for provider card ID ${providerCardId}`)
    }

    // update record
    await this.userCardEntityService.updateOne({
      id: userCard.id,
      status: CardStatus.CardIssueFailure,
      statusReason: payload.reason ?? 'No card failure reason provided from BridgeCard',
      providerPayload: payload,
    })

    try {
      // Fail the fund/fee orders that were created when the virtual card request was sent
      await this.failOrderIfExists(userCard.id, CardOrderType.InitialFund)
      await this.failOrderIfExists(userCard.id, CardOrderType.Fee)
    } catch (err: any) {
      this.logger.error(
        `critical: error occurred attempting to fail initial card fund order for card ID ${userCard.id}`,
      )
      this.logger.error(err)
    }

    return userCard.id
  }

  async freezeActiveCards(userId: number, reason?: string): Promise<void> {
    const userCards = await this.userCardEntityService
      .select()
      .where(x => x.userId.eq(userId))
      .where(x => x.status.eq(CardStatus.CardIssued))
      .fetch(UserCardModel)

    for (const card of userCards) {
      // skip cards with no provider card ID - unlikely scenario
      if (isNil(card.providerCardId)) {
        this.logger.error(`unexpected: could not freeze card - no provider card ID set for card ID ${card.id}`)
        return
      }

      try {
        // freeze the card
        await this.bridgeCardService.freezeCard(card.providerCardId)

        // update the record
        await this.userCardEntityService.updateOne({
          id: card.id,
          status: CardStatus.CardFrozen,
          statusReason: reason ?? 'All cards frozen. No reason provided.',
          providerPayload: null,
        })
      } catch (err: any) {
        this.logger.error(`critical: failed to freeze user card [user ID: ${userId}, card ID: ${card.id}]`)
        this.logger.error(err)
      }
    }
  }

  async unfreezeActiveCards(userId: number): Promise<void> {
    const userCards = await this.userCardEntityService
      .select()
      .where(x => x.userId.eq(userId))
      .where(x => x.status.eq(CardStatus.CardFrozen))
      .fetch(UserCardModel)

    for (const card of userCards) {
      // skip cards with no provider card ID - unlikely scenario
      if (isNil(card.providerCardId)) {
        this.logger.error(`unexpected: could not unfreeze card - no provider card ID set for card ID ${card.id}`)
        return
      }

      try {
        // unfreeze the card
        await this.bridgeCardService.unfreezeCard(card.providerCardId)

        // update the record
        await this.userCardEntityService.updateOne({
          id: card.id,
          status: CardStatus.CardIssued,
          statusReason: null,
          providerPayload: null,
        })
      } catch (err: any) {
        this.logger.error(`critical: failed to unfreeze user card [user ID: ${userId}, card ID: ${card.id}]`)
        this.logger.error(err)
      }
    }
  }

  async freezeCard(userId: number, cardId: number, reason?: string): Promise<void> {
    const userCard = await this.userCardEntityService
      .select()
      .where(x => x.userId.eq(userId))
      .where(x => x.id.eq(cardId))
      .where(x => x.status.eq(CardStatus.CardIssued))
      .fetchOne(UserCardModel)

    if (!userCard) {
      this.logger.error(`unexpected: virtual card not found for user (ID: ${userId}) with id ${cardId}`)
      throw new NotFoundError('Card not found.')
    }

    // skip cards with no provider card ID - unlikely scenario
    if (isNil(userCard.providerCardId)) {
      this.logger.error(`unexpected: could not freeze card - no provider card ID set for card ID ${userCard.id}`)
      throw new Error('Cannot freeze card.')
    }

    try {
      // freeze the card
      await this.bridgeCardService.freezeCard(userCard.providerCardId)

      // update the record
      await this.userCardEntityService.updateOne({
        id: userCard.id,
        status: CardStatus.CardFrozen,
        statusReason: reason ?? null,
        providerPayload: null,
      })
    } catch (err: any) {
      this.logger.error(`critical: failed to freeze user card [user ID: ${userId}, card ID: ${userCard.id}]`)
      this.logger.error(err)

      throw new Error('Failed to freeze card.')
    }
  }

  async unfreezeCard(userId: number, cardId: number, reason?: string): Promise<void> {
    const userCard = await this.userCardEntityService
      .select()
      .where(x => x.userId.eq(userId))
      .where(x => x.id.eq(cardId))
      .where(x => x.status.eq(CardStatus.CardFrozen))
      .fetchOne(UserCardModel)

    if (!userCard) {
      this.logger.error(`unexpected: virtual card not found for user (ID: ${userId}) with id ${cardId}`)
      throw new NotFoundError('Card not found.')
    }

    // skip cards with no provider card ID - unlikely scenario
    if (isNil(userCard.providerCardId)) {
      this.logger.error(`unexpected: could not unfreeze card - no provider card ID set for card ID ${userCard.id}`)
      throw new Error('Cannot unfreeze card.')
    }
    try {
      // unfreeze the card
      await this.bridgeCardService.unfreezeCard(userCard.providerCardId)

      // update the record
      await this.userCardEntityService.updateOne({
        id: userCard.id,
        status: CardStatus.CardIssued,
        statusReason: reason ?? null,
        providerPayload: null,
      })
    } catch (err: any) {
      this.logger.error(`critical: failed to unfreeze user card [user ID: ${userId}, card ID: ${userCard.id}]`)
      this.logger.error(err)

      throw new Error('Failed to unfreeze card.')
    }
  }

  async createCard(userId: number, forceIssueCostZero?: boolean): Promise<void> {
    const [user, userCardHolder, userActiveCard] = await Promise.all([
      this.userEntityService.getOne({ id: userId }),
      this.userCardHolderEntityService.getOne({ userId: userId }),
      this.getUserCardInternal(userId),
    ])

    if (!user) {
      this.logger.error(`critical: user with ID ${userId} not found while attempting to create card`)
      throw new Error(`critical: user not found`)
    }

    if (!userCardHolder || !userCardHolder.providerCardHolderId) {
      this.logger.error(`unexpected: could not find cardholder record for user with ID ${userId}`)
      throw new Error(`critical: user cardholder not found`)
    }

    // For now users are limited to one card
    // If a card record is found for them, throw an error and do not create another card
    if (userActiveCard) {
      this.logger.error(
        `unexpected: received another request to create a card for user with ID [user ID: ${userId}]. Users can only have one card.`,
      )

      throw new Error(`User already has a virtual card`)
    }

    // Create user's card wallet
    const walletId = await this.walletService.createCardWallet(user.id)

    // Create the card before sending the request - this way we can lock the funds
    const userCard = await this.userCardEntityService.addOne({
      userId: userId,
      provider: CardProvider.BridgeCard,
      providerCardId: null,
      status: CardStatus.CardNotIssued,
      statusReason: 'Create card request not sent yet',
      providerPayload: null,
      last4Digits: null,
      walletId: walletId,
    })

    const cardCosts = await this.getCardIssueCosts()
    if (forceIssueCostZero) {
      cardCosts.creationFeeUsdc = 0
      cardCosts.initialFundAmountUsdc = 0
    }

    let fundOrderId = null
    let feeOrderId = null

    try {
      // Create an order for the fee amount
      if (cardCosts.creationFeeUsdc) {
        feeOrderId = await this.chargeFeeOnCardCreation(userId, userCard, cardCosts.creationFeeUsdc)
      }

      // Create an order for the fund amount
      if (cardCosts.initialFundAmountUsdc) {
        fundOrderId = await this.fundCardOnCardCreation(userId, userCard, cardCosts.initialFundAmountUsdc)
      }
    } catch (err: any) {
      this.logger.error(`critical: fee or fund order failed on card creation attempt for user (ID: ${userId})`)
      this.logger.error(err)

      // We want to make sure we fail any pending orders that got created, so we don't keep the user's money
      if (feeOrderId) {
        const feeOrderStatus = await this.orderStatusEntityService.getOne({ orderId: feeOrderId })
        if (feeOrderStatus?.status === CardOrderStatus.Pending) {
          await this.failPendingCardOrder(feeOrderId, `card-service:fee-order-failure`)
        }
      }

      if (fundOrderId) {
        const fundOrderStatus = await this.orderStatusEntityService.getOne({ orderId: fundOrderId })

        if (fundOrderStatus?.status === CardOrderStatus.Pending) {
          await this.failPendingCardOrder(fundOrderId, `card-service:fund-order-failure`)
        }
      }

      // update the card record
      await this.userCardEntityService.updateOne({
        id: userCard.id,
        status: CardStatus.CardIssueFailure,
        statusReason: 'Initial funding and fee transactions failed.',
      })

      // Back out of the card creation process afterwards
      return
    }

    let providerCardId: string | null = null
    let cardStatus = null
    let cardStatusReason = null

    try {
      const cardRequest: CreateCardRequest = {
        cardholder_id: userCardHolder.providerCardHolderId,
        card_type: CardType.Virtual,
        card_brand: this.bridgeCardConfig.cardConfig.brand,
        card_currency: CardCurrency.USD,
        funding_amount: cardCosts.initialFundAmountUsdc
          ? this.convertToBridgecardAmount(cardCosts.initialFundAmountUsdc)
          : undefined,
        meta_data: {
          owner: user.uid,
        },
      }

      // Send the create card request to BridgeCard
      providerCardId = await this.bridgeCardService.createCard(cardRequest)

      // If successful, set issue pending status
      cardStatus = CardStatus.CardIssuePending
    } catch (err: any) {
      this.logger.error(`Failed to create card for user [User ID: ${userId}] in BridgeCard. Error: ${err.message}`)
      this.logger.error(err)

      // If failed, set failure status
      cardStatus = CardStatus.CardIssueFailure
      cardStatusReason = err.message
    }

    // update the card record
    await this.userCardEntityService.updateOne({
      id: userCard.id,
      providerCardId: providerCardId,
      status: cardStatus,
      statusReason: cardStatusReason,
      providerPayload: null,
      last4Digits: null,
    })

    // If the card failed to create in Bridgecard, revert the transactions
    if (cardStatus === CardStatus.CardIssueFailure) {
      try {
        await this.failOrderIfExists(userCard.id, CardOrderType.InitialFund)
        await this.failOrderIfExists(userCard.id, CardOrderType.Fee)
      } catch (err: any) {
        this.logger.error(
          `critical: failed to move the initial card orders to failure status for user ID ${userId} and card ID ${userCard.id}`,
        )
        this.logger.error(err)
      }
    }
  }

  async fundCard(userId: number, amount: number): Promise<number> {
    const [userCard, cardCosts] = await Promise.all([this.getUserCard(userId), this.getCardIssueCosts()])

    const order = await this.cardOrderService.createInternalOrder(userId, {
      amount: amount,
      type: CardOrderType.Fund,
      fee: cardCosts.creditFeeUsdc,
      cardId: userCard.id,
    })

    // create the order and fee activity in initial state
    await this.coActivityService.createActivity(order.id)

    // get up-to-date card order details
    const [cardOrder, cardholder] = await Promise.all([
      this.cardOrderEntityService.getOne({ orderId: order.id }),
      this.userCardHolderEntityService.getOne({ userId: userId }),
    ])
    if (!cardOrder) {
      throw new Error(`unexpected: cannot find order associated with fund card request ${order.id}`)
    }
    if (!cardholder?.providerCardHolderId) {
      throw new Error(`unexpected: cannot find cardholder associated with user ${userId}`)
    }

    // create the transaction in our ledger
    let transaction: TransactionModel
    let feeTransaction: TransactionModel | null = null
    try {
      transaction = await this.cardOrderService.createInternalTransaction(order.id, {
        amount: amount,
        orderType: CardOrderType.Fund,
        cardWalletId: userCard.walletId,
      })

      if (cardCosts.creditFeeUsdc) {
        feeTransaction = await this.cardOrderService.createFeeTransaction(order.id, {
          amount: cardCosts.creditFeeUsdc,
          parentTransactionId: transaction.id,
          cardWalletId: userCard.walletId,
        })
      }
    } catch (err: any) {
      this.logger.error(err)
      await this.cardOrderStatusService.failure(order.id, 'card-service')
      await this.coActivityService.failActivity(order.id)

      // TODO: this will rollback the transaction. We don't need this because we handled the error
      // throw new Error(`Failed to create a transaction`)

      return cardOrder.orderId
    }

    await this.cardOrderStatusService.pending(order.id, 'card-service')

    // initiate the transaction in the Virtual Card provider
    let fundCardResponse: IFundCardResult
    try {
      fundCardResponse = await this.bridgeCardService.fundCard({
        card_id: userCard.providerCardId!,
        amount: this.convertToBridgecardAmount(amount),
        currency: CardCurrency.USD,
        transaction_reference: transaction.uid,
      })
    } catch (err: any) {
      this.logger.error(err)

      // if the card credit failed immediately, handle it here
      await this.transactionService.failTransaction(transaction.id)
      if (feeTransaction) {
        await this.transactionService.failTransaction(feeTransaction.id)
      }
      await this.cardOrderStatusService.failure(cardOrder.orderId, 'card-service')
      await this.coActivityService.failActivity(cardOrder.orderId)

      // TODO: this will rollback the transaction. We don't need this because we handled the error
      // throw new Error(`Provider failure`)

      return cardOrder.orderId
    }

    // update card order with payload
    await this.cardOrderEntityService.updateOne({
      orderId: cardOrder.orderId,
      providerPayload: fundCardResponse,
    })

    if (fundCardResponse.processed) {
      // emulate the webhook if the fund is processed immediately
      await this.onCardCreditSuccess({
        card_id: userCard.providerCardId!,
        amount: this.convertToBridgecardAmount(amount),
        card_transaction_type: CardTransactionType.Credit,
        cardholder_id: cardholder.providerCardHolderId,
        currency: CardCurrency.USD,
        issuing_app_id: 'api:card-service:immediate',
        livemode: false,
        transaction_reference: transaction.uid,
      })
    }

    return order.id
  }

  async onCardCreditSuccess(payload: ICardCreditPayload): Promise<number> {
    this.logger.info(`Starting processing card credit success. Provider card id: ${payload.card_id}`)

    const cardTransaction = await this.getCardTransaction(payload.card_id, payload.transaction_reference)
    if (cardTransaction?.transactionType !== CardTransactionType.Credit) {
      throw new Error(`unexpected: could not process non [credit] card transaction`)
    }

    // find user card
    const userCard = await this.userCardEntityService.getOne({ providerCardId: payload.card_id })
    if (!userCard) {
      throw new Error(`User card not found`)
    }

    const transaction = await this.transactionService.getTransaction(cardTransaction.transactionReference)
    const feeTransactions = await this.transactionService.getChildTransactions(transaction.id)
    const cardOrder = await this.cardOrderEntityService.getOne({ orderId: transaction.orderId })
    if (!cardOrder) {
      throw new Error(`Card order not found`)
    }

    // update card order with payload and provider transaction reference
    await this.cardOrderEntityService.updateOne({
      orderId: cardOrder.orderId,
      providerTransactionReference: cardTransaction.bridgecardTransactionReference,
      providerPayload: payload,
    })

    try {
      for (const feeTransaction of feeTransactions) {
        await this.transactionService.completeTransaction(feeTransaction.id)
      }

      await this.transactionService.completeTransaction(transaction.id)
    } catch (err: any) {
      this.logger.error(err)
      await this.cardOrderStatusService.failure(cardOrder.orderId, 'card-service')
      await this.coActivityService.failActivity(cardOrder.orderId)

      throw err
    }

    const transactionStatus = await this.transactionService.getTransactionStatus(transaction.id)
    if (transactionStatus === TransactionStatus.Completed) {
      await this.cardOrderStatusService.completed(cardOrder.orderId, 'card-service')
      await this.coActivityService.completeActivity(cardOrder.orderId)
    } else {
      await this.cardOrderStatusService.failure(cardOrder.orderId, 'card-service')
      await this.coActivityService.failActivity(cardOrder.orderId)
    }

    return cardOrder.orderId
  }

  async onCardCreditFailed(payload: ICardCreditPayload): Promise<number> {
    this.logger.info(`Starting processing card credit failure. Provider card id: ${payload.card_id}`)

    const cardTransaction = await this.getCardTransaction(payload.card_id, payload.transaction_reference)
    if (cardTransaction?.transactionType !== CardTransactionType.Credit) {
      throw new Error(`unexpected: could not process non [credit] card transaction`)
    }

    // find user card
    const userCard = await this.userCardEntityService.getOne({ providerCardId: payload.card_id })
    if (!userCard) {
      throw new Error(`User card not found`)
    }

    const transaction = await this.transactionService.getTransaction(cardTransaction.transactionReference)
    const feeTransactions = await this.transactionService.getChildTransactions(transaction.id)
    const cardOrder = await this.cardOrderEntityService.getOne({ orderId: transaction.orderId })
    if (!cardOrder) {
      throw new Error(`Card order not found`)
    }

    // update card order with payload and provider transaction reference
    await this.cardOrderEntityService.updateOne({
      orderId: cardOrder.orderId,
      providerTransactionReference: cardTransaction.bridgecardTransactionReference,
      providerPayload: payload,
    })

    await this.transactionService.failTransaction(transaction.id)
    for (const feeTransaction of feeTransactions) {
      await this.transactionService.failTransaction(feeTransaction.id)
    }
    await this.cardOrderStatusService.failure(cardOrder.orderId, 'card-service')
    await this.coActivityService.failActivity(cardOrder.orderId)

    return cardOrder.orderId
  }

  async deleteCardHolder(userId: number): Promise<void> {
    const userCardHolder = await this.userCardHolderEntityService.getOne({ userId: userId })
    if (!userCardHolder) {
      this.logger.warn(`No user cardholder found for user ID ${userId}`)
      return
    }

    if (isNil(userCardHolder.providerCardHolderId)) {
      this.logger.error(`unexpected: could not delete cardholder - no provider cardholder ID set for user ID ${userId}`)
      return
    }

    try {
      await this.bridgeCardService.deleteCardHolder(userCardHolder.providerCardHolderId)

      // update cardholder and cards to deleted
      await Promise.all([
        this.userCardHolderEntityService.updateOne({
          userId: userId,
          status: CardHolderStatus.Deleted,
          statusReason: null,
          providerPayload: null,
        }),
        this.userCardEntityService.update(
          {
            status: CardStatus.CardDeleted,
            statusReason: null,
            providerPayload: null,
          },
          x => x.userId.eq(userId),
        ),
      ])
    } catch (err: any) {
      this.logger.error(`critical: unable to delete cardholder and cards for user ID ${userId}`)
      this.logger.error(err)
    }
  }

  async onCardDebitSuccess(payload: ICardDebitSuccessPayload): Promise<number> {
    this.logger.info(`Starting processing card debit success. Provider card id: ${payload.card_id}`)

    const cardTransaction = await this.getCardTransaction(payload.card_id, payload.transaction_reference)
    if (cardTransaction?.transactionType !== CardTransactionType.Debit) {
      throw new Error(`unexpected: could not process non [debit] card transaction`)
    }

    let transaction: TransactionModel | null = null
    try {
      transaction = await this.transactionService.getTransaction(cardTransaction.transactionReference)
    } catch (ignore) {}

    // if a transaction exists in our DB then it is the "unload" transaction.
    if (transaction) {
      return this.handleUnloadTransactionSuccess(cardTransaction, payload, transaction)
    } else {
      return this.handleSpendTransactionSuccess(cardTransaction, payload)
    }
  }

  private async handleSpendTransactionSuccess(
    cardTransaction: ICardTransaction,
    payload: ICardDebitSuccessPayload,
  ): Promise<number> {
    const partnerFee = this.convertFromBridgecardAmount(payload.partner_interchange_fee)
    const neobankFee = this.convertFromBridgecardAmount(payload.interchange_revenue)
    const spendTransactionFee = USDC_CURRENCY(partnerFee).add(neobankFee).value

    // find user
    const userCard = await this.userCardEntityService.getOne({ providerCardId: cardTransaction.cardId })
    if (!userCard) {
      throw new Error(`User card not found`)
    }

    const user = await this.userEntityService.getOne({ id: userCard.userId })
    if (!user) {
      throw new Error(`User not found`)
    }

    const order = await this.cardOrderService.createSpendOrder(user.id, {
      amount: cardTransaction.amount,
      providerTransactionReference: `${cardTransaction.bridgecardTransactionReference}`,
      providerPayload: payload,
      providerDescription: payload.description,
      fee: spendTransactionFee,
      cardId: userCard.id,
    })
    await this.coActivityService.createActivity(order.id)

    let feeOrder: OrderModel | null = null
    if (spendTransactionFee) {
      feeOrder = await this.cardOrderService.createFeeOrder(user.id, {
        orderType: CardOrderType.SpendFee,
        amount: spendTransactionFee,
        providerTransactionReference: `${cardTransaction.bridgecardTransactionReference}_fee`,
        cardId: userCard.id,
      })
      await this.coActivityService.createActivity(feeOrder.id)
    }

    // create the transaction in our ledger
    let transaction: TransactionModel
    let feeTransaction: TransactionModel | null = null
    try {
      transaction = await this.cardOrderService.completeSpendTransaction(order.id, {
        amount: cardTransaction.amount,
        cardWalletId: userCard.walletId,
      })

      if (feeOrder) {
        feeTransaction = await this.cardOrderService.createFeeTransaction(feeOrder.id, {
          amount: spendTransactionFee,
          cardWalletId: userCard.walletId,
          parentTransactionId: transaction.id,
          immediateStatus: TransactionStatus.Completed,
          debitFeeFromCardWallet: true,
        })
      }
    } catch (err: any) {
      this.logger.error(err)
      await this.cardOrderStatusService.failure(order.id, 'card-service')
      await this.coActivityService.failActivity(order.id)

      if (feeOrder) {
        await this.cardOrderStatusService.failure(feeOrder.id, 'card-service')
        await this.coActivityService.failActivity(feeOrder.id)
      }

      throw new Error(`Failed to create a transaction`)
    }

    const transactionStatus = await this.transactionService.getTransactionStatus(transaction.id)
    let feeTransactionStatus: TransactionStatus = TransactionStatus.Completed
    if (feeTransaction) {
      feeTransactionStatus = await this.transactionService.getTransactionStatus(feeTransaction.id)
    }

    if (transactionStatus === TransactionStatus.Completed && feeTransactionStatus === TransactionStatus.Completed) {
      await this.cardOrderStatusService.completed(order.id, 'card-service')
      await this.coActivityService.completeActivity(order.id)

      if (feeOrder) {
        await this.cardOrderStatusService.completed(feeOrder.id, 'card-service')
        await this.coActivityService.completeActivity(feeOrder.id)
      }
    } else {
      await this.cardOrderStatusService.failure(order.id, 'card-service')
      await this.coActivityService.failActivity(order.id)

      if (feeOrder) {
        await this.cardOrderStatusService.failure(feeOrder.id, 'card-service')
        await this.coActivityService.failActivity(feeOrder.id)
      }
    }

    return order.id
  }

  private async handleUnloadTransactionSuccess(
    cardTransaction: ICardTransaction,
    payload: ICardDebitSuccessPayload,
    transaction: TransactionModel,
  ): Promise<number> {
    this.logger.info(`Starting processing card unload success. Provider card id: ${payload.card_id}`)

    // find user card
    const userCard = await this.userCardEntityService.getOne({ providerCardId: payload.card_id })
    if (!userCard) {
      throw new Error(`User card not found`)
    }

    const cardOrder = await this.cardOrderEntityService.getOne({ orderId: transaction.orderId })
    if (!cardOrder) {
      throw new Error(`Card order not found`)
    }

    // update card order with payload and provider transaction reference
    await this.cardOrderEntityService.updateOne({
      orderId: cardOrder.orderId,
      providerTransactionReference: cardTransaction.bridgecardTransactionReference,
      providerPayload: payload,
    })

    try {
      await this.transactionService.completeTransaction(transaction.id)
    } catch (err: any) {
      this.logger.error(err)
      await this.cardOrderStatusService.failure(cardOrder.orderId, 'card-service')
      await this.coActivityService.failActivity(cardOrder.orderId)

      throw err
    }

    const transactionStatus = await this.transactionService.getTransactionStatus(transaction.id)
    if (transactionStatus === TransactionStatus.Completed) {
      await this.cardOrderStatusService.completed(cardOrder.orderId, 'card-service')
      await this.coActivityService.completeActivity(cardOrder.orderId)
    } else {
      await this.cardOrderStatusService.failure(cardOrder.orderId, 'card-service')
      await this.coActivityService.failActivity(cardOrder.orderId)
    }

    return cardOrder.orderId
  }

  async onCardDebitDeclined(payload: ICardDebitDeclinedPayload): Promise<number> {
    this.logger.warn(`Starting processing card declined debit. Provider card id: ${payload.card_id}`)

    const amount = this.convertFromBridgecardAmount(payload.amount)

    // find user
    const [userCard, cardCosts] = await Promise.all([
      this.userCardEntityService.getOne({ providerCardId: payload.card_id }),
      this.getCardIssueCosts(),
    ])
    if (!userCard) {
      throw new Error(`User card not found`)
    }

    const user = await this.userEntityService.getOne({ id: userCard.userId })
    if (!user) {
      throw new Error(`User not found`)
    }

    const order = await this.cardOrderService.createSpendOrder(user.id, {
      amount: amount,
      providerTransactionReference: null,
      providerPayload: payload,
      providerDescription: payload.description,
      fee: cardCosts.debitFeeUsdc,
      cardId: userCard.id,
    })
    await this.coActivityService.createActivity(order.id)

    try {
      const transaction = await this.cardOrderService.declineSpendTransaction(order.id, {
        amount: amount,
        cardWalletId: userCard.walletId,
      })

      if (cardCosts.debitFeeUsdc) {
        await this.cardOrderService.createFeeTransaction(order.id, {
          amount: amount,
          cardWalletId: userCard.walletId,
          parentTransactionId: transaction.id,
          immediateStatus: TransactionStatus.Failed,
        })
      }
    } catch (err: any) {
      this.logger.error(err)
    }

    await this.cardOrderStatusService.failure(order.id, 'card-service')
    await this.coActivityService.failActivity(order.id, payload.decline_reason)

    return order.id
  }

  async onCardReversalSuccess(payload: ICardReversalPayload): Promise<void> {
    this.logger.warn(`Starting processing card reversal success. Provider card id: ${payload.card_id}`)

    const cardTransaction = await this.getCardTransaction(payload.card_id, payload.transaction_reference)
    if (cardTransaction?.transactionType !== CardTransactionType.Credit) {
      throw new Error(`unexpected: could not process non [credit] card transaction`)
    }

    // find user
    const userCard = await this.userCardEntityService.getOne({ providerCardId: payload.card_id })
    if (!userCard) {
      throw new Error(`User card not found`)
    }

    const user = await this.userEntityService.getOne({ id: userCard.userId })
    if (!user) {
      throw new Error(`User not found`)
    }

    const order = await this.cardOrderService.createReversalOrder(user.id, {
      amount: cardTransaction.amount,
      providerTransactionReference: cardTransaction.bridgecardTransactionReference,
      providerPayload: payload,
      fee: 0,
      cardId: userCard.id,
    })
    await this.coActivityService.createActivity(order.id)

    // create the transaction in our ledger
    let transaction: TransactionModel
    try {
      transaction = await this.cardOrderService.completeReversalTransaction(order.id, {
        amount: cardTransaction.amount,
        cardWalletId: userCard.walletId,
      })
    } catch (err: any) {
      this.logger.error(err)
      await this.cardOrderStatusService.failure(order.id, 'card-service')
      await this.coActivityService.failActivity(order.id)

      throw new Error(`Failed to create a transaction`)
    }

    const transactionStatus = await this.transactionService.getTransactionStatus(transaction.id)
    if (transactionStatus === TransactionStatus.Completed) {
      await this.cardOrderStatusService.completed(order.id, 'card-service')
      await this.coActivityService.completeActivity(order.id)
    } else {
      await this.cardOrderStatusService.failure(order.id, 'card-service')
      await this.coActivityService.failActivity(order.id)
    }
  }

  async unloadCard(userId: number, amount: number): Promise<void> {
    const userCard = await this.getUserCard(userId)

    const order = await this.cardOrderService.createInternalOrder(userId, {
      amount: amount,
      type: CardOrderType.Unload,
      fee: 0,
      cardId: userCard.id,
    })
    await this.coActivityService.createActivity(order.id)

    // get up-to-date card order details
    const [cardOrder, cardholder] = await Promise.all([
      this.cardOrderEntityService.getOne({ orderId: order.id }),
      this.userCardHolderEntityService.getOne({ userId: userId }),
    ])
    if (!cardOrder) {
      throw new Error(`unexpected: cannot find order associated with fund card request ${order.id}`)
    }
    if (!cardholder?.providerCardHolderId) {
      throw new Error(`unexpected: cannot find cardholder associated with user ${userId}`)
    }

    // create the transaction in our ledger
    let transaction: TransactionModel
    try {
      transaction = await this.cardOrderService.createInternalTransaction(order.id, {
        amount: amount,
        orderType: CardOrderType.Unload,
        cardWalletId: userCard.walletId,
      })
    } catch (err: any) {
      this.logger.error(err)
      await this.cardOrderStatusService.failure(order.id, 'card-service')
      await this.coActivityService.failActivity(order.id)

      // TODO: this will rollback the transaction. We don't need this because we handled the error
      // throw new Error(`Failed to create a transaction`)

      return
    }

    // initiate the transaction in the Virtual Card provider
    let unloadCardResponse: UnloadCardInfo
    try {
      unloadCardResponse = await this.bridgeCardService.unloadCard({
        card_id: userCard.providerCardId!,
        amount: this.convertToBridgecardAmount(amount),
        currency: CardCurrency.USD,
        transaction_reference: transaction.uid,
      })
    } catch (err: any) {
      this.logger.error(err)

      // if the card credit failed immediately, handle it here
      await this.transactionService.failTransaction(transaction.id)
      await this.cardOrderStatusService.failure(order.id, 'card-service')
      await this.coActivityService.failActivity(order.id)

      // TODO: this will rollback the transaction. We don't need this because we handled the error
      // throw new Error(`Provider failure`)
      return
    }

    // We have to be sure that transaction is created in BridgeCard
    await this.cardOrderEntityService.updateOne({
      orderId: cardOrder.orderId,
      providerPayload: unloadCardResponse,
    })
  }

  async notifyCardUpdate(userId: number): Promise<void> {
    try {
      const user = await this.userEntityService.getOne({ id: userId })
      if (!user) {
        this.logger.error(`notifyCardUpdate(): user with a userId ${userId} is not found`)
        return
      }

      const increment = firestore.FieldValue.increment(1)
      await firestore()
        .collection('user')
        .doc(user.fireUserId)
        .set({ card: { version: increment } }, { merge: true })
    } catch (err: any) {
      this.logger.error(`critical: notify user about card update failed`)
      this.logger.error(err)
    }
  }

  async getCardIssueCosts(): Promise<CardIssueCosts> {
    const fees = await this.feeService.getFees()
    if (!fees) {
      this.logger.error('critical: unable to get fees')
    }

    const { cardConfig } = this.bridgeCardConfig

    let totalCreationFee = USDC_CURRENCY(0)
    if (fees?.createCardFeeAmountUsdc) {
      totalCreationFee = totalCreationFee.add(fees.createCardFeeAmountUsdc)
    }

    if (cardConfig.creationFee) {
      totalCreationFee = totalCreationFee.add(cardConfig.creationFee)
    }

    return {
      creationFeeUsdc: totalCreationFee.value,
      maintenanceFeeUsdc: cardConfig.maintenanceFee ?? 0,
      creditFeeUsdc: cardConfig.creditFee ?? 0,
      debitFeeUsdc: cardConfig.debitFee ?? 0,

      initialFundAmountUsdc: cardConfig.initialFundAmount ?? 0,

      minFundAmountUsdc: cardConfig.minFundAmount ?? 0,
      maxFundAmountUsdc: cardConfig.maxFundAmount ?? 10,
      minUnloadAmountUsdc: cardConfig.minUnloadAmount ?? 0,
      maxUnloadAmountUsdc: cardConfig.maxUnloadAmount ?? 10,
      minRequiredBalanceForCreation: totalCreationFee.add(cardConfig.initialFundAmount ?? 0).value,
    }
  }

  private async fundCardOnCardCreation(userId: number, userCard: UserCardModel, amount: number): Promise<number> {
    const cardCosts = await this.getCardIssueCosts()

    const order = await this.cardOrderService.createInternalOrder(userId, {
      amount: amount,
      type: CardOrderType.InitialFund,
      fee: cardCosts.creditFeeUsdc,
      cardId: userCard.id,
    })

    // create the order activity in initial state
    await this.coActivityService.createActivity(order.id)

    // get up-to-date card order details
    const [cardOrder, cardholder] = await Promise.all([
      this.cardOrderEntityService.getOne({ orderId: order.id }),
      this.userCardHolderEntityService.getOne({ userId: userId }),
    ])
    if (!cardOrder) {
      throw new Error(`unexpected: cannot find order associated with fund card request ${order.id}`)
    }
    if (!cardholder?.providerCardHolderId) {
      throw new Error(`unexpected: cannot find cardholder associated with user ${userId}`)
    }

    try {
      // create the transaction in our ledger
      const transaction = await this.cardOrderService.createInternalTransaction(order.id, {
        amount: amount,
        orderType: CardOrderType.InitialFund,
        cardWalletId: userCard.walletId,
      })

      if (cardCosts.creditFeeUsdc) {
        await this.cardOrderService.createFeeTransaction(order.id, {
          amount: cardCosts.creditFeeUsdc,
          parentTransactionId: transaction.id,
          cardWalletId: userCard.walletId,
        })
      }
    } catch (err: any) {
      this.logger.error(err)
      await this.cardOrderStatusService.failure(order.id, 'card-service')
      await this.coActivityService.failActivity(order.id)

      throw new Error(`Failed to create a transaction`)
    }

    await this.cardOrderStatusService.pending(order.id, 'card-service')

    return order.id
  }

  private async chargeFeeOnCardCreation(userId: number, userCard: UserCardModel, amount: number): Promise<number> {
    const order = await this.cardOrderService.createFeeOrder(userId, {
      orderType: CardOrderType.Fee,
      amount: amount,
      cardId: userCard.id,
    })

    // create the order activity in initial state
    await this.coActivityService.createActivity(order.id)

    // get up-to-date card order details
    const [cardOrder, cardholder] = await Promise.all([
      this.cardOrderEntityService.getOne({ orderId: order.id }),
      this.userCardHolderEntityService.getOne({ userId: userId }),
    ])
    if (!cardOrder) {
      throw new Error(`unexpected: cannot find order associated with fund card request ${order.id}`)
    }
    if (!cardholder?.providerCardHolderId) {
      throw new Error(`unexpected: cannot find cardholder associated with user ${userId}`)
    }

    try {
      // create the transaction in our ledger
      await this.cardOrderService.createFeeTransaction(order.id, {
        amount: amount,
        cardWalletId: userCard.walletId,
      })
    } catch (err: any) {
      this.logger.error(err)
      await this.cardOrderStatusService.failure(order.id, 'card-service')
      await this.coActivityService.failActivity(order.id)

      throw new Error(`Failed to create a transaction`)
    }

    await this.cardOrderStatusService.pending(order.id, 'card-service')

    return order.id
  }

  private async completeOrderIfExists(
    cardId: number,
    type: CardOrderType.InitialFund | CardOrderType.Fee,
  ): Promise<void> {
    // It should be safe to assume here that this will be the only one order of the specific type
    // associated with the card since it was just created
    const cardOrder = await this.cardOrderEntityService.getOne({ cardId: cardId, type: type })
    if (!cardOrder) {
      return
    }

    await this.completePendingCardOrder(cardOrder.orderId)
  }

  private async failOrderIfExists(cardId: number, type: CardOrderType.InitialFund | CardOrderType.Fee): Promise<void> {
    // It should be safe to assume here that this will be the only one order of the specific type
    // associated with the card since it was just created
    const cardOrder = await this.cardOrderEntityService.getOne({ cardId: cardId, type: type })
    if (!cardOrder) {
      return
    }

    await this.failPendingCardOrder(cardOrder.orderId, `card-service:on-card-failure`)
  }

  private async completePendingCardOrder(orderId: number): Promise<void> {
    const transactions = await this.transactionService.getTransactionsByOrderId(orderId)
    if (transactions.length > 1) {
      throw new Error(`unexpected: more than one transaction found for order ID (${orderId})`)
    }

    try {
      await this.transactionService.completeTransaction(transactions[0].id)
    } catch (err: any) {
      this.logger.error(err)
      await this.cardOrderStatusService.failure(orderId, 'card-service')
      await this.coActivityService.failActivity(orderId)

      throw err
    }

    const transactionStatus = await this.transactionService.getTransactionStatus(transactions[0].id)
    if (transactionStatus === TransactionStatus.Completed) {
      await this.cardOrderStatusService.completed(orderId, 'card-service')
      await this.coActivityService.completeActivity(orderId)
    } else {
      await this.cardOrderStatusService.failure(orderId, 'card-service')
      await this.coActivityService.failActivity(orderId)
    }
  }

  private async failPendingCardOrder(orderId: number, reason?: string): Promise<void> {
    const transactions = await this.transactionService.getTransactionsByOrderId(orderId)
    if (transactions.length > 1) {
      throw new Error(`unexpected: more than one transaction found for order ID (${orderId})`)
    }

    await this.transactionService.failTransaction(transactions[0].id)
    await this.cardOrderStatusService.failure(orderId, 'card-service')
    await this.coActivityService.failActivity(orderId, reason)
  }
}

const DocTypeMapper: Record<IdDocType, IdType> = {
  [IdDocType.DriverLicence]: IdType.NigerianDriversLicense,
  [IdDocType.IDCard]: IdType.NigerianNin,
  [IdDocType.Passport]: IdType.NigerianInternationalPassport,
  [IdDocType.ResidencePermit]: IdType.NigerianNin,
  [IdDocType.Selfie]: IdType.NigerianBvnVerification,
}

export type CardholderPayload =
  | {
      bvn: string
      documentType: IdDocType
      documentNo: string
      documentUrl: string
    }
  | {
      bvn: string
      documentType: IdDocType.Selfie
      documentUrl: string
    }

type CardIssueCosts = {
  creationFeeUsdc: number
  maintenanceFeeUsdc: number
  debitFeeUsdc: number
  creditFeeUsdc: number

  initialFundAmountUsdc: number

  minFundAmountUsdc: number
  maxFundAmountUsdc: number
  minUnloadAmountUsdc: number
  maxUnloadAmountUsdc: number

  minRequiredBalanceForCreation: number
}

2023

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'

import { BadRequestError, ForbiddenError } from '../../../errors'

import {
  CardStatus,
  IUserCardEntityService,
  IUserCardHolderEntityService,
  IUserEntityService,
  UserCardEntityServiceSymbol,
  UserCardHolderEntityServiceSymbol,
  UserCardModel,
  UserEntityServiceSymbol,
  UserLevel,
  UserLevelOrder,
} from '../../../models/db'
import { CardOperationInput, UserCardInput } from '../../../models/request'
import { BridgeCardConfigSymbol, IBridgeCardConfig } from '../../../models/config'

import { IUserLevelService, UserLevelServiceSymbol } from '../../level/user-level.service'
import { CardholderPayload, CardServiceSymbol, ICardService } from '../../dumb/card/card.service'
import { IUserBalanceService, UserBalanceServiceSymbol } from '../../user-balance.service'
import { IdentityServiceSymbol, IIdentityService } from '../../dumb/identity/identity.service'
import { IUserStatusService, UserStatusServiceSymbol } from '../../user-status.service'
import { NotFoundError } from '@ts-awesome/rest'
import { FeeServiceSymbol, IFeeService } from '../../fee.service'
import { IdDocType } from '../../../models/sumsub/applicant-status.response'

export interface IVirtualCardBusinessService {
  /**
   * Checks if a user can have a virtual cards and sends the request to issue one
   * @param userId The user's ID
   * @param payload The required information to issue a virtual card
   */
  issueVirtualCard(userId: number, payload: UserCardInput): Promise<void>

  /**
   * Verifies if the user can fund their virtual card with the entered amount and sends the request to fund the card
   * @param userId The user's ID
   * @param payload The required information to fund the virtual card
   */
  fundVirtualCard(userId: number, payload: CardOperationInput): Promise<void>

  /**
   * Verifies if the user can unload their virtual card with the entered amount and sends the request to unload the card
   * @param userId The user's ID
   * @param payload The required information to unload the virtual card
   */
  unloadVirtualCard(userId: number, payload: CardOperationInput): Promise<void>

  /**
   * Verifies a virtual card can be issued to the user
   * Checks for: Eligible user account level, non-existing virtual card
   * @param userId The user's ID
   */
  verifyVirtualCardCanBeIssuedToUser(userId: number): Promise<void>

  /**
   * Freezes the user's virtual card
   * @param userId  The user ID
   */
  freezeVirtualCard(userId: number): Promise<void>

  /**
   * Unfreezes the user's virtual card
   * @param userId The user ID
   */
  unfreezeVirtualCard(userId: number): Promise<void>

  /**
   * Re-issue the user's virtual card.
   *
   * @param userId The user ID
   */
  reissueVirtualCard(userId: number): Promise<void>
}

export const VirtualCardBusinessServiceSymbol = Symbol.for('IVirtualCardBusinessService')

@injectable()
export class VirtualCardBusinessService implements IVirtualCardBusinessService {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>
  @inject(BridgeCardConfigSymbol) bridgeCardConfig!: IBridgeCardConfig

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserCardHolderEntityServiceSymbol) userCardHolderService!: IUserCardHolderEntityService
  @inject(UserCardEntityServiceSymbol) userCardEntityService!: IUserCardEntityService
  @inject(UserStatusServiceSymbol) userStatusService!: IUserStatusService

  @inject(CardServiceSymbol) cardService!: ICardService
  @inject(IdentityServiceSymbol) identityService!: IIdentityService
  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService
  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService
  @inject(FeeServiceSymbol) feeService!: IFeeService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(VirtualCardBusinessService)
  }

  async issueVirtualCard(userId: number, payload: UserCardInput): Promise<void> {
    this.logger.info(`Starting process to issue virtual card to user [User ID: ${userId}]`)

    // Verify we can issue a virtual card to the user, will throw an err if not
    await this.verifyVirtualCardCanBeIssuedToUser(userId)

    let createPayload: CardholderPayload
    if (this.bridgeCardConfig.useBVNVerification) {
      const identityDocumentUrl = await this.identityService.createIdentityDocumentUrl(userId, {
        requester: 'bridgecard',
        type: 'selfie',
      })

      createPayload = {
        bvn: payload.bvn,
        documentType: IdDocType.Selfie,
        documentUrl: identityDocumentUrl,
      }
    } else {
      const identityDocumentUrl = await this.identityService.createIdentityDocumentUrl(userId, {
        requester: 'bridgecard',
        type: 'identity',
      })

      // Get the user's identity document
      const identityDocument = await this.identityService.getIdentityDocumentInfo(userId)
      if (!identityDocument) {
        throw new Error(`unexpected: identity document not found for user [User ID: ${userId}]`)
      }

      createPayload = {
        bvn: payload.bvn,
        documentNo: identityDocument.no,
        documentType: identityDocument.type,
        documentUrl: identityDocumentUrl,
      }
    }

    // Issue the virtual card in its own uow
    await this.uow.auto(() => this.cardService.createVirtualCardHolder(userId, createPayload))

    // Notify about card update
    await this.cardService.notifyCardUpdate(userId)

    this.logger.info(`Completed process to issue virtual card to user [User ID: ${userId}]`)
  }

  async fundVirtualCard(userId: number, payload: CardOperationInput): Promise<void> {
    // Verify the user can fund their virtual card with the entered amount, if not it throws an error
    await this.verifyUserCanFundCardWithAmount(userId, payload.amount)

    // send request to fund the card
    await this.uow.auto(() => this.cardService.fundCard(userId, payload.amount))
  }

  async unloadVirtualCard(userId: number, payload: CardOperationInput): Promise<void> {
    // Verify the user can unload their virtual card with the entered amount, if not it throws an error
    await this.verifyUserCanUnloadCardWithAmount(userId, payload.amount)

    // send request to unload the card
    await this.uow.auto(() => this.cardService.unloadCard(userId, payload.amount))
  }

  async verifyVirtualCardCanBeIssuedToUser(userId: number): Promise<void> {
    const isEligibleUserLevel = await this.isUserLevelAllowed(userId)
    if (!isEligibleUserLevel) {
      throw new ForbiddenError(`User account is not eligible to have a virtual card.`)
    }

    // q - Is this enough to check if a user already has issued a virtual card or has requested one?
    const userCardHolder = await this.userCardHolderService.getOne({ userId: userId })
    if (userCardHolder) {
      this.logger.error(`unexpected: attempted to issue another virtual card for user [User ID: ${userId}]`)
      throw new ForbiddenError(`User can only have one virtual card`)
    }

    // check user has at least the minimum fees/funding amounts - there is a fee to create a card and minimum fund amount
    const cardCosts = await this.cardService.getCardIssueCosts()
    const savingBalance = await this.userBalanceService.getUserBalance(userId)

    if (cardCosts.minRequiredBalanceForCreation > savingBalance.balance) {
      this.logger.error(
        `conflict: minimum required amount (${cardCosts.minRequiredBalanceForCreation}) to create a virtual card is bigger than the user's balance (${savingBalance.balance})`,
      )

      throw new BadRequestError(`User has insufficient balance`)
    }
  }

  async freezeVirtualCard(userId: number): Promise<void> {
    const userCard = await this.verifyUserCanFreezeCard(userId)

    // freeze the card
    await this.uow.auto(() => this.cardService.freezeCard(userId, userCard.id))
  }

  async unfreezeVirtualCard(userId: number): Promise<void> {
    const userCard = await this.verifyUserCanUnfreezeCard(userId)

    // unfreeze the card
    await this.uow.auto(() => this.cardService.unfreezeCard(userId, userCard.id))
  }

  async reissueVirtualCard(userId: number): Promise<void> {
    const userCard = await this.cardService.getUserCard(userId)
    const cardDetails = await this.cardService.getCardDetails(userId)

    if (cardDetails.balance > 0) {
      await this.unloadVirtualCard(userId, { amount: cardDetails.balance })
    }
    await this.freezeVirtualCard(userId)

    await this.uow.auto(async () => {
      // we must acquire a lock on this record
      const cardholder = await this.userCardHolderService.getForUpdateByUserId(userId)
      if (!cardholder) {
        throw new Error(`unexpected: cardholder userId:${userId} is not found`)
      }

      await this.userCardEntityService.updateOne({
        id: userCard.id,
        status: CardStatus.CardDeleted,
        statusReason: 'reissueVirtualCard:card is frozen',
      })

      await this.cardService.createCard(userId, true)
    })
  }

  private async isUserLevelAllowed(userId: number): Promise<boolean> {
    const { current } = await this.userLevelService.getUserLevel(userId)

    // If the user level is less than 2 (meaning KYC has not been verified/completed), return false
    // User has to be at least KYC/account level 2 for virtual cards
    if (UserLevelOrder[current.code] < UserLevelOrder[UserLevel.Level2]) {
      this.logger.error(`unexpected: user level ${current.code} cannot have a virtual card`)

      return false
    }

    return true
  }

  /**
   * Verifies if a user can fund their virtual card with the entered amount
   * Checks for: Existing user, active virtual card, eligible fund amount
   * @param userId The user's ID
   * @param fundAmount The amount to fund the virtual card in USDC
   */
  private async verifyUserCanFundCardWithAmount(userId: number, fundAmount: number): Promise<void> {
    // verify user: exists, active
    await this.verifyUser(userId)

    // verify user's card: exists, in the correct state
    await this.verifyUserCard(userId)

    // positive value, 2 digits after comma
    await this.verifyAmount(fundAmount)

    // check user saving balance
    //    - if balance is lte 0 - throw an error
    const savingBalance = await this.userBalanceService.getUserBalance(userId)
    if (fundAmount > savingBalance.balance) {
      this.logger.error(`conflict: amount (${fundAmount}) is bigger than user's balance (${savingBalance.balance})`)

      throw new BadRequestError(`User has insufficient balance`)
    }
  }

  /**
   * Verifies if a user can fund their virtual card with the entered amount
   * Checks for: Existing user, active virtual card, eligible fund amount
   *
   * @param userId The user's ID
   * @param unloadAmount The amount to fund the virtual card in USDC
   */
  private async verifyUserCanUnloadCardWithAmount(userId: number, unloadAmount: number): Promise<void> {
    // verify user: exists, active
    await this.verifyUser(userId)

    // verify user's card: exists, in the correct state
    await this.verifyUserCard(userId)

    // positive value, 2 digits after comma
    await this.verifyAmount(unloadAmount)
  }

  private async verifyUser(userId: number): Promise<void> {
    const user = await this.userEntityService.getOne({ id: userId })
    if (!user) {
      this.logger.error(`unexpected: could not find user id:${userId}`)
      throw new NotFoundError('The user is not found')
    }

    const isUserActive = await this.userStatusService.isUserActive(userId)
    if (!isUserActive) {
      this.logger.error(`unexpected: user is not active id:${userId}`)
      throw new NotFoundError('The user is not found')
    }
  }

  private async verifyUserCard(userId: number): Promise<void> {
    const user = await this.userEntityService.getOne({ id: userId })
    if (!user) {
      this.logger.error(`unexpected: could not find user id:${userId}`)
      throw new NotFoundError('The user is not found')
    }

    const userCard = await this.cardService.getUserCard(user.id)
    if (!userCard.providerCardId || userCard.status !== CardStatus.CardIssued) {
      this.logger.error(
        `unexpected: user (${user.id}) card (${userCard?.uid}) is not eligible for funding. Card status: ${userCard?.status}`,
      )
      throw new BadRequestError(`User card is not ready`)
    }
  }

  private async verifyAmount(amount: number): Promise<void> {
    if (amount <= 0) {
      this.logger.error(`unexpected: amount (${amount}) cannot be less or equal to zero`)
      throw new BadRequestError(`Amount cannot be less than or equal to 0`)
    }

    if (!this.cardService.validateUSDAmount(amount)) {
      this.logger.error(`unexpected: amount (${amount}) is not valid`)
      throw new BadRequestError(`Invalid amount`)
    }
  }

  private async verifyUserCanFreezeCard(userId: number): Promise<UserCardModel> {
    const user = await this.userEntityService.getOne({ id: userId })
    if (!user) {
      this.logger.error(`unexpected: could not find user id:${userId}`)
      throw new NotFoundError('User not found')
    }

    const userCard = await this.cardService.getUserCard(user.id)
    if (!userCard.providerCardId || userCard.status !== CardStatus.CardIssued) {
      this.logger.error(
        `unexpected: user (${user.id}) card (${userCard?.uid}) is not eligible for freezing. Card status: ${userCard?.status}`,
      )
      throw new BadRequestError(`Card cannot be frozen.`)
    }

    return userCard
  }

  private async verifyUserCanUnfreezeCard(userId: number): Promise<UserCardModel> {
    const user = await this.userEntityService.getOne({ id: userId })
    if (!user) {
      this.logger.error(`unexpected: could not find user id:${userId}`)
      throw new NotFoundError('User not found')
    }

    const userCard = await this.cardService.getUserCard(user.id)
    if (!userCard.providerCardId || userCard.status !== CardStatus.CardFrozen) {
      this.logger.error(
        `unexpected: user (${user.id}) card (${userCard?.uid}) is not eligible for unfreezing. Card status: ${userCard?.status}`,
      )
      throw new BadRequestError(`Card cannot be unfrozen.`)
    }

    return userCard
  }
}

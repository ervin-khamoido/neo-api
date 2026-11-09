2021

import { inject, injectable, named } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { getTime } from 'date-fns'
import fbAdmin from 'firebase-admin'

import { CustomErrorObject, CustomError, CustomErrorType, StatusCode } from '../errors'

import {
  UserModel,
  IUserBankAccountEntityService,
  UserBankAccountEntityServiceSymbol,
  IModernTreasuryWalletEntityService,
  IUserEntityService,
  ModernTreasuryWalletEntityServiceSymbol,
  UserEntityServiceSymbol,
  IUserDetailsEntityService,
  UserDetailsEntityServiceSymbol,
  UserStatus,
  userStatusesIneligibleForUpdate,
} from '../models/db'
import { DeleteUserValidateOutput } from '../models/response'

import { ModernTreasuryServiceSymbol, IModernTreasuryService } from './modern-treasury.service'
import { UserBalanceServiceSymbol, IUserBalanceService } from './user-balance.service'
import { UserBankAccountServiceSymbol, IUserBankAccountService } from './user-bank-account.service'
import { CalculatorServiceSymbol, ICalculatorService } from './calculator.service'
import { FeeServiceSymbol, IFeeService } from './fee.service'
import { ExchangeRateServiceSymbol, IExchangeRateService } from './exchange-rate.service'
import { IUserRetentionService, UserRetentionServiceSymbol } from './user-retention.service'
import { IUserOrderService, UserOrderServiceSymbol } from './user-order.service'
import { IWalletService, WalletServiceSymbol } from './wallet.service'
import { FeeCalculatorServiceSymbol, IFeeCalculatorService } from './fee-calculator.service'
import { IPushService, PushServiceSymbol } from './push.service'
import { IMailerService, MailerServiceSymbol, MailTemplates } from '../lib/services/mailer'
import { CardServiceSymbol, ICardService } from './dumb/card/card.service'

export interface IUserAccountManagementService {
  validateDelete(user: UserModel): Promise<DeleteUserValidateOutput>
  delete(user: UserModel): Promise<void>

  block(user: UserModel, updatedBy: string, reason?: string | null): Promise<void>
  unblock(user: UserModel, updatedBy: string, reason?: string | null): Promise<void>
}

export const UserAccountManagementServiceSymbol = Symbol.for('IUserAccountManagementService')

@injectable()
export class UserAccountManagementService implements IUserAccountManagementService {
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserBankAccountEntityServiceSymbol) userBankAccountEntityService!: IUserBankAccountEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(ModernTreasuryWalletEntityServiceSymbol)
  modernTreasuryWalletEntityService!: IModernTreasuryWalletEntityService

  @inject(UserBankAccountServiceSymbol) userBankAccountService!: IUserBankAccountService
  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService
  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService
  @inject(UserOrderServiceSymbol) userOrderService!: IUserOrderService
  @inject(FeeServiceSymbol) feeService!: IFeeService
  @inject(ExchangeRateServiceSymbol) exchangeRateService!: IExchangeRateService
  @inject(UserRetentionServiceSymbol) userRetentionService!: IUserRetentionService
  @inject(WalletServiceSymbol) walletService!: IWalletService
  @inject(PushServiceSymbol) pushService!: IPushService
  @inject(MailerServiceSymbol) mailerService!: IMailerService
  @inject(CardServiceSymbol) cardService!: ICardService

  @named('calculatorV2')
  @inject(CalculatorServiceSymbol)
  calculatorService!: ICalculatorService

  @named('feesV2')
  @inject(FeeCalculatorServiceSymbol)
  feeCalculatorService!: IFeeCalculatorService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserAccountManagementService)
  }

  async validateDelete(user: UserModel): Promise<DeleteUserValidateOutput> {
    this.logger.trace('The user started account delete process: validateDelete')

    const errors: CustomErrorObject[] = []

    // Verify user account has balance less than minimum fees
    const verifyBalanceError = await this.verifyBalance(user.id)

    if (verifyBalanceError) {
      errors.push(verifyBalanceError)
    }

    // Verify user has no open orders
    const verifyOpenedOrdersError = await this.verifyOpenedOrders(user.id)
    if (verifyOpenedOrdersError) {
      errors.push(verifyOpenedOrdersError)
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors: errors,
      }
    }

    return {
      valid: true,
    }
  }

  async delete(user: UserModel): Promise<void> {
    this.logger.trace('The user confirmed account delete process: delete')

    // Verify the user can delete their account, throw an error if not
    const validationResult = await this.validateDelete(user)
    if (!validationResult.valid) {
      throw new CustomError('BadRequest', StatusCode.BadRequest, validationResult.errors!)
    }

    // Lock user details record for updating user status
    const userDetails = await this.userDetailsEntityService.getForUpdate(user.id)
    if (!userDetails) {
      throw new Error('unexpected: user details not found')
    }

    const unsubscribePromise = this.pushService.unsubscribeAll(user)

    // Change email and phone number in the “user” table
    const deletedTime = getTime(new Date()).toString()
    const userUpdatePromise = this.userEntityService.updateOne({
      id: userDetails.userId,
      phone: `d_${deletedTime}`,
      email: `${deletedTime}@neobank.deleted`,
    })

    // Update the user status
    const userStatusUpdatePromise = this.userDetailsEntityService.updateOne({
      userId: userDetails.userId,
      status: UserStatus.DeleteRetention,
      updatedBy: null,
    })

    // Create the user retention record
    const userRetentionPromise = this.userRetentionService.create(userDetails.userId)

    await Promise.all([unsubscribePromise, userUpdatePromise, userStatusUpdatePromise, userRetentionPromise])

    // Delete user wallet (mark underlying MT accounts as deleted)
    await this.walletService.delete(user)

    // Delete user cardholder/cards
    await this.cardService.deleteCardHolder(user.id)

    // Delete firebase user
    // TODO: we need to make sure that
    // * this operation is fulfilled 100%
    // * this operation does not rollback the transaction (the user will restore to be active but the wallets will be deleted) - DONE
    try {
      await fbAdmin.auth().deleteUser(user.fireUserId)
    } catch (err: any) {
      const errorMessage = err.stack ? `${err.stack}` : `${err.toString()}`
      this.logger.error(errorMessage)
    }
  }

  async block(user: UserModel, updatedBy: string, reason?: string | null): Promise<void> {
    this.logger.info(`Starting blocking process, updating user [${user.uid}] status: blocked`)

    // Lock user details record for updating user status
    const userDetails = await this.userDetailsEntityService.getForUpdate(user.id)
    if (!userDetails) {
      throw new Error('unexpected: user details not found')
    }

    if (userStatusesIneligibleForUpdate.includes(userDetails.status)) {
      this.logger.warn(
        `conflict: could not block a user [${user.uid}] due to incompatible status: ${userDetails.status}`,
      )
      return
    }

    // Update the user status to blocked
    await this.userDetailsEntityService.updateOne({
      userId: userDetails.userId,
      status: UserStatus.Blocked,
      statusReason: reason,
      updatedBy: updatedBy,
    })

    // Block user wallet(s) (mark underlying MT accounts as blocked)
    await this.walletService.block(user)

    // Freeze user cards
    await this.cardService.freezeActiveCards(user.id, 'User account blocked, all cards frozen.')

    await this.mailerService.send({
      to: user.email,
      subject: 'Your Neobank account has been blocked',
      template: {
        name: MailTemplates.AccountBlocked,
        variables: {
          first_name: userDetails.firstName ?? 'Friend',
        },
        conditionalContent: {},
      },
    })
  }

  async unblock(user: UserModel, updatedBy: string, statusReason?: string | null): Promise<void> {
    this.logger.info(`Starting unblocking process, updating user [${user.uid}] status: active`)

    // Lock user details record for updating user status
    const userDetails = await this.userDetailsEntityService.getForUpdate(user.id)
    if (!userDetails) {
      throw new Error('unexpected: user details not found')
    }

    if (userDetails.status !== UserStatus.Blocked) {
      throw new Error(`unexpected: user is not in blocked status ${user.uid}`)
    }

    // Update the user status to Active
    await this.userDetailsEntityService.updateOne({
      userId: userDetails.userId,
      status: UserStatus.Active,
      statusReason: statusReason,
      updatedBy: updatedBy,
    })

    // Unblock user wallet(s) (mark underlying MT accounts as active)
    await this.walletService.unblock(user)

    // Unfreeze user cards
    await this.cardService.unfreezeActiveCards(user.id)
  }

  private async verifyBalance(userId: number): Promise<CustomErrorObject | null> {
    // Verify user account has balance less than minimum fees
    const [userBalance, fees, exchangeRate] = await Promise.all([
      this.userBalanceService.getUserBalance(userId),
      this.feeService.getFees(),
      this.exchangeRateService.getLatestExchangeRate(),
    ])

    const calculatorResponse = await this.calculatorService.calculateSellUsdcTotals(
      {
        amount: 0,
        amountUsdc: userBalance.balance,
      },
      {
        feeConfig: {
          flatFee: fees!.sellFlatFee,
          percentageFee: fees!.sellPercentageFee,
          agentFee: <any>null,
          feeMultiplier: <any>null,
        },
        exchangeRate: exchangeRate.sellExchangeRate,
      },
      this.feeCalculatorService,
      false,
    )

    // If the user has more than what the minimum fees would calculate out to, the user should sell
    if (calculatorResponse.calculatedTotal > 0) {
      this.logger.info(
        `User delete validation error. User balance is greater than the minimum amount (${calculatorResponse.calculatedTotal})`,
      )

      return {
        type: CustomErrorType.Validation,
        code: 'remaining_balance',
        message: 'Cannot delete account with an outstanding balance.',
      }
    }

    return null
  }

  private async verifyOpenedOrders(userId: number): Promise<CustomErrorObject | null> {
    const openOrders = await this.userOrderService.getOpenOrderCounts(userId)
    if (openOrders.totalOpenOrderCount > 0) {
      this.logger.info(
        `User delete validation error. User has opened orders (PO: ${openOrders.openPurchaseOrderCount}, SO: ${openOrders.openSellOrderCount})`,
      )

      return {
        type: CustomErrorType.Validation,
        code: 'open_orders',
        message: 'Cannot delete account until all opened orders are closed.',
      }
    }

    return null
  }
}

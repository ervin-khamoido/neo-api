2021

import { inject, named } from 'inversify'
import { BadRequestError, httpPost, requestBody, RequestError, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'

import { isNil } from 'lodash'

import { UserLevel, UserLevelOrder, UserModel } from '../../../../models/db'
import { ICreateSellOrderInput, SellOrderV2Input } from '../../../../models/request'
import { PostEntityOutput } from '../../../../models/response'
import { ISellUsdcCalculationsOutput } from '../../../../models/calculator'
import { ActionApprovalResult, UserActionType } from '../../../../models/limits'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol, OneTimeAccessMiddleware } from '../../../../middleware'

import { OneTimeAction } from '../../../../services/pin-code.service'
import { FeeServiceSymbol, IFeeService } from '../../../../services/fee.service'
import { CalculatorServiceSymbol, ICalculatorService } from '../../../../services/calculator.service'
import { ExchangeRateServiceSymbol, IExchangeRateService } from '../../../../services/exchange-rate.service'
import { ISellOrderService, SellOrderServiceSymbol } from '../../../../services/sell-order.service'
import { FeeCalculatorServiceSymbol, IFeeCalculatorService } from '../../../../services/fee-calculator.service'
import { IUserLimitService, UserLimitServiceSymbol } from '../../../../services/user-limit.service'
import { IUserLevelService, UserLevelServiceSymbol } from '../../../../services/level/user-level.service'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IUserBankAccountService, UserBankAccountServiceSymbol } from '../../../../services/user-bank-account.service'

@httpPost(
  '/api/v3/order/sell',
  FireAccessMiddleware({ checkRevoked: true }),
  OneTimeAccessMiddleware({ action: OneTimeAction.CreateSellOrder }),
)
export class PostCreateSellOrderRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(FeeServiceSymbol) feeService!: IFeeService
  @inject(ExchangeRateServiceSymbol) exchangeRateService!: IExchangeRateService
  @inject(SellOrderServiceSymbol) sellOrderService!: ISellOrderService
  @inject(UserLimitServiceSymbol) userLimitService!: IUserLimitService
  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService
  @inject(UserBankAccountServiceSymbol) userBankAccountService!: IUserBankAccountService

  @named('calculatorV2')
  @inject(CalculatorServiceSymbol)
  calculatorService!: ICalculatorService

  @named('feesV2')
  @inject(FeeCalculatorServiceSymbol)
  feeCalculatorService!: IFeeCalculatorService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(PostCreateSellOrderRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v3/order/sell',
    description: 'Create a sell order',
    summary: 'POST create a sell order',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Sell order information',
        schema: SellOrderV2Input,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Created sell order', content: PostEntityOutput },
      [StatusCode.Conflict]: {
        description: 'Calculations are not correct or Exchange rate, fee, or agent fee changed',
      },
      [StatusCode.Forbidden]: { description: 'User cannot create an order' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(SellOrderV2Input) body: SellOrderV2Input): Promise<void> {
    // Verify the user is a high enough level to create a SO
    await this.verifyUserLevel()

    // Verify the user can create a sell order, will throw an error if they cannot
    await this.verifyUserCanCreateSellOrder()

    // Verify the exchange rate have not changed, will throw an error if they have
    await this.verifyExchangeRate(body)

    // Verify the calculations sent from the frontend are correct, if they are incorrect it will throw an error
    const calculationResult = await this.verifyCalculations(body)

    // Verify the user did not exceed their daily sell limit, if they did throw an error
    const lockVersion = await this.verifyActionIsApproved(body.totalUsdc)

    const createSellOrderInput: ICreateSellOrderInput = {
      sellOrder: body,
      calculationResult: calculationResult,
    }

    // Create the order and sell order
    const order = await this.uow.auto(() =>
      this.sellOrderService.createSellOrder(createSellOrderInput, this.user, lockVersion),
    )

    if (!order) {
      throw new Error(`internal error: Sell order was not created`)
    }

    return this.json(order, StatusCode.Created, PostEntityOutput)
  }

  private async verifyExchangeRate(body: SellOrderV2Input): Promise<void> {
    const verifiedExchangeRate = await this.exchangeRateService.verifySellExchangeRate(body.exchangeRate)

    // If the exchange rate has changed, throw a conflict error
    if (!verifiedExchangeRate) {
      throw new RequestError('The exchange rate has changed', 'Conflict', StatusCode.Conflict)
    }
  }

  private async verifyCalculations(body: SellOrderV2Input): Promise<ISellUsdcCalculationsOutput> {
    const fees = await this.feeService.getFees()

    const feeConfig = {
      flatFee: fees!.sellFlatFee,
      percentageFee: fees!.sellPercentageFee,
      feeMultiplier: <any>null,
      agentFee: <any>null,
    }

    const calculationResult = await this.calculatorService.calculateSellUsdcTotals(
      {
        amount: body.amount,
        amountUsdc: body.amountUsdc,
      },
      {
        feeConfig: feeConfig,
        exchangeRate: body.exchangeRate,
      },
      this.feeCalculatorService,
      body.includeFees,
    )

    if (calculationResult.calculatedTotal <= 0) {
      throw new BadRequestError('The total amount should be greater than zero')
    }

    if (
      calculationResult.fee.total !== body.feeTotal ||
      calculationResult.calculatedTotal !== body.total ||
      calculationResult.calculatedPurchaseAmount !== body.amount
    ) {
      throw new RequestError('Calculations are incorrect', 'Conflict', StatusCode.Conflict)
    }

    return calculationResult
  }

  private async verifyActionIsApproved(amount: number): Promise<number> {
    const actionApproval = await this.userLimitService.getActionApproval(this.user.id, UserActionType.SO, amount)

    // If the user action is not approved, throw an error
    if (actionApproval.result !== ActionApprovalResult.Approved) {
      throw new RequestError(`The amount exceeded the user's sell limit`, 'Conflict', StatusCode.Conflict)
    }

    if (isNil(actionApproval.lockVersion)) {
      throw new RequestError(`Could not retrieve lock on the balance`, 'Server Error', StatusCode.ServerError)
    }

    return actionApproval.lockVersion
  }

  private async verifyUserLevel(): Promise<void> {
    const { current } = await this.userLevelService.getUserLevel(this.user.id)

    // special case when old user has a bank account
    if (current.code === UserLevel.Level0) {
      const bankAccountExists = await this.userBankAccountService.anyBankAccountExists(this.user)
      if (bankAccountExists) {
        return
      }
    }

    // If the user level is less than 1, throw an error
    if (UserLevelOrder[current.code] < UserLevelOrder[UserLevel.Level1]) {
      this.logger.error(`unexpected: user level ${current.code} cannot create SO`)
      throw new RequestError(`Wrong account level`, 'Forbidden', StatusCode.Forbidden)
    }
  }

  private async verifyUserCanCreateSellOrder(): Promise<void> {
    const canCreateOutput = await this.sellOrderService.canCreateSellOrder(this.user.id)

    // If the user cannot create a sell order, throw an error
    if (!canCreateOutput.canCreate) {
      throw new RequestError(`${canCreateOutput.reason}`, 'Forbidden', StatusCode.Forbidden)
    }
  }
}

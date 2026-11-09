2021

import { inject, named } from 'inversify'

import { httpPost, requestBody, RequestError, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'

import { PostEntityOutput } from '../../../../models/response'
import { ICreatePurchaseOrderInput, PurchaseOrderV2Input } from '../../../../models/request'
import { UserLevel, UserLevelOrder, UserModel } from '../../../../models/db'
import { AppConfigSymbol, IAppConfig } from '../../../../models/config'
import { IBuyUsdcCalculationsOutput } from '../../../../models/calculator'
import { ActionApprovalResult, UserActionType } from '../../../../models/limits'

import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol } from '../../../../middleware'

import { FeeServiceSymbol, IFeeService } from '../../../../services/fee.service'
import { CalculatorServiceSymbol, ICalculatorService } from '../../../../services/calculator.service'
import { ExchangeRateServiceSymbol, IExchangeRateService } from '../../../../services/exchange-rate.service'
import { IPurchaseOrderService, PurchaseOrderServiceSymbol } from '../../../../services/purchase-order.service'
import {
  FeeCalculatorServiceSymbol,
  IFeeCalculatorService,
  IFeeConfig,
} from '../../../../services/fee-calculator.service'
import { IUserLimitService, UserLimitServiceSymbol } from '../../../../services/user-limit.service'
import { IUserLevelService, UserLevelServiceSymbol } from '../../../../services/level/user-level.service'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

@httpPost('/api/v3/order/purchase', FireAccessMiddleware({ checkRevoked: true }), PinAccessMiddleware)
export class PostCreatePurchaseOrderRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel
  @inject(AppConfigSymbol) config!: IAppConfig
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(FeeServiceSymbol) feeService!: IFeeService
  @inject(ExchangeRateServiceSymbol) exchangeRateEntityService!: IExchangeRateService
  @inject(PurchaseOrderServiceSymbol) purchaseOrderService!: IPurchaseOrderService
  @inject(UserLimitServiceSymbol) userLimitService!: IUserLimitService
  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService

  @named('feesV2')
  @inject(FeeCalculatorServiceSymbol)
  feeCalculatorService!: IFeeCalculatorService

  @named('calculatorV2')
  @inject(CalculatorServiceSymbol)
  calculatorService!: ICalculatorService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(PostCreatePurchaseOrderRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v3/order/purchase',
    description: 'Create a purchase order',
    summary: 'POST create a purchase order',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Purchase order information',
        schema: PurchaseOrderV2Input,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Created purchase order', content: PostEntityOutput },
      [StatusCode.Conflict]: {
        description: 'Calculations are not correct or Exchange rate, fee, or agent fee changed',
      },
      [StatusCode.Forbidden]: { description: 'User cannot create an order' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(PurchaseOrderV2Input) body: PurchaseOrderV2Input): Promise<void> {
    // Verify the user is a high enough level to create a PO
    await this.verifyUserLevel()

    // Verify the user can create a purchase order, will throw an error if they cannot
    await this.verifyUserCanCreatePurchaseOrder()

    // Verify the fees and exchange rate have not changed, will throw an error if they have
    await this.verifyExchangeRate(body)

    // Verify the calculations sent from the frontend are correct, if they are incorrect it will throw an error
    const calculationResult = await this.verifyCalculations(body)

    // Verify the user did not exceed their daily buy limit, if they did throw an error
    await this.verifyActionIsApproved(body.totalUsdc)

    // Create the order and purchase order
    const createPurchaseOrderInput: ICreatePurchaseOrderInput = {
      purchaseOrder: body,
      calculationResult: calculationResult,
    }
    const order = await this.uow.auto(() =>
      this.purchaseOrderService.createPurchaseOrder(createPurchaseOrderInput, this.user),
    )

    return this.json(order, StatusCode.Created, PostEntityOutput)
  }

  private async verifyExchangeRate(body: PurchaseOrderV2Input): Promise<void> {
    const verifiedExchangeRate = await this.exchangeRateEntityService.verifyBuyExchangeRate(body.exchangeRate)

    // If the exchange rate has changed, throw a conflict error
    if (!verifiedExchangeRate) {
      throw new RequestError('The exchange rate has changed', 'Conflict', StatusCode.Conflict)
    }
  }

  private async verifyCalculations(body: PurchaseOrderV2Input): Promise<IBuyUsdcCalculationsOutput> {
    const fees = await this.feeService.getFees()

    const feeConfig: IFeeConfig = {
      feeMultiplier: <any>null,
      agentFee: <any>null,
      flatFee: fees!.purchaseFlatFee,
      percentageFee: fees!.purchasePercentageFee,
    }

    const calculatorResponse = await this.calculatorService.calculateBuyUsdcTotals(
      {
        amount: body.amount,
        totalUsdc: body.totalUsdc,
      },
      {
        feeConfig: feeConfig,
        exchangeRate: body.exchangeRate,
      },
      this.feeCalculatorService,
      body.includeFees,
    )

    if (
      calculatorResponse.fee.total !== body.feeTotal ||
      calculatorResponse.calculatedTotal !== body.total ||
      calculatorResponse.calculatedTotalUsdc !== body.totalUsdc
    ) {
      throw new RequestError('Calculations are incorrect', 'Conflict', StatusCode.Conflict)
    }

    return calculatorResponse
  }

  private async verifyActionIsApproved(amount: number): Promise<void> {
    const actionApproval = await this.userLimitService.getActionApproval(this.user.id, UserActionType.PO, amount)

    // If the user action is not approved, throw an error
    if (actionApproval.result !== ActionApprovalResult.Approved) {
      throw new RequestError(`The amount exceeded the user's limit`, 'Conflict', StatusCode.Conflict)
    }
  }

  private async verifyUserLevel(): Promise<void> {
    const { current } = await this.userLevelService.getUserLevel(this.user.id)

    // If the user level is less than 1, throw an error
    if (UserLevelOrder[current.code] < UserLevelOrder[UserLevel.Level1]) {
      this.logger.error(`unexpected: user level ${current.code} cannot create PO`)
      throw new RequestError(`Wrong account level`, 'Forbidden', StatusCode.Forbidden)
    }
  }

  private async verifyUserCanCreatePurchaseOrder(): Promise<void> {
    const canCreateOutput = await this.purchaseOrderService.canCreatePurchaseOrder(this.user.id)

    // If the user cannot create a purchase order, throw an error
    if (!canCreateOutput.canCreate) {
      throw new RequestError(`${canCreateOutput.reason}`, 'Forbidden', StatusCode.Forbidden)
    }
  }
}

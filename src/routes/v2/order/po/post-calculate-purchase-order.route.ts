2021

import { inject, named } from 'inversify'

import { httpPost, Route, requestBody, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'

import { CalculatePurchaseOrderInput } from '../../../../models/request/calculate-order.input'
import { CalculateOrderOutput } from '../../../../models/response/calculate-order.output'
import { ExchangeRateServiceSymbol, IExchangeRateService } from '../../../../services/exchange-rate.service'
import { NGN, PERCENTAGE } from '../../../../utils/formatter'
import { CalculatorServiceSymbol, ICalculatorService } from '../../../../services/calculator.service'
import { FeeServiceSymbol, IFeeService } from '../../../../services/fee.service'
import { FeeCalculatorServiceSymbol, IFeeCalculatorService } from '../../../../services/fee-calculator.service'

@httpPost('/api/v2/calculate/order/purchase', FireAccessMiddleware())
export class PostCalculateBuyOrderFeeRoute extends Route {
  @inject(FeeServiceSymbol) feeService!: IFeeService

  @named('feesV2')
  @inject(FeeCalculatorServiceSymbol)
  feeCalculatorService!: IFeeCalculatorService

  @inject(ExchangeRateServiceSymbol) exchangeRateService!: IExchangeRateService
  @named('calculatorV2')
  @inject(CalculatorServiceSymbol)
  calculatorService!: ICalculatorService

  @OpenApiOperationPost({
    path: '/api/v2/calculate/order/purchase',
    description: 'Calculate purchase order totals',
    summary: 'Calculate purchase order totals',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Calculate order input details',
        schema: CalculatePurchaseOrderInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'Purchase Order totals', content: CalculateOrderOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(CalculatePurchaseOrderInput) body: CalculatePurchaseOrderInput): Promise<void> {
    const effectiveExchangeRate = body.exchangeRate

    const [exchangeRate, fee] = await Promise.all([
      this.exchangeRateService.getLatestExchangeRate(),
      this.feeService.getFees(),
    ])

    const feeConfig = {
      flatFee: fee!.purchaseFlatFee,
      percentageFee: fee!.purchasePercentageFee,
      agentFee: fee!.agentFeeAmountNgn,
      feeMultiplier: fee!.companyFeeMultiplier,
    }

    const calculatedOrder = await this.calculatorService.calculateBuyUsdcTotals(
      {
        amount: body.amount,
        totalUsdc: body.amountUsdc,
      },
      {
        exchangeRate: effectiveExchangeRate,
        feeConfig: feeConfig,
      },
      this.feeCalculatorService,
      body.includeFees,
    )

    const feesExplainer = `Our saving fee is ${PERCENTAGE(
      feeConfig.percentageFee,
    )} of the purchase amount. Minimum fee is ${NGN(feeConfig.flatFee, false)}`

    const result: CalculateOrderOutput = {
      exchangeRate: effectiveExchangeRate,
      exchangeRates: {
        client: {
          value: body.exchangeRate,
          valueFormatted: NGN(body.exchangeRate, false),
        },
        server: {
          value: exchangeRate.buyExchangeRate,
          valueFormatted: NGN(exchangeRate.buyExchangeRate, false),
          date: new Date(),
        },
      },
      calculatedItems: [
        {
          label: 'Fees',
          code: 'fee_total',
          value: calculatedOrder.fee.total,
          valueFormatted: NGN(calculatedOrder.fee.total, false),
        },
        {
          label: 'Amount to be credited',
          code: 'purchase_amount',
          value: calculatedOrder.amount,
          valueFormatted: NGN(calculatedOrder.amount, false),
        },
      ],
      messages: [{ message: feesExplainer, code: 'fee_explainer' }],
      includeFees: body.includeFees,
      amount: calculatedOrder.amount,
      amountUsdc: calculatedOrder.calculatedTotalUsdc,
      feeTotal: calculatedOrder.fee.total,
      total: calculatedOrder.calculatedTotal,
    }

    return this.json(result, CalculateOrderOutput)
  }
}

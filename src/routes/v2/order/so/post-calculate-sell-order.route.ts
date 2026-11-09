2023

import { inject, named } from 'inversify'

import { httpPost, Route, requestBody, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'

import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'

import { ExchangeRateServiceSymbol, IExchangeRateService } from '../../../../services/exchange-rate.service'
import { NGN, PERCENTAGE } from '../../../../utils/formatter'
import { FeeCalculatorServiceSymbol, IFeeCalculatorService } from '../../../../services/fee-calculator.service'
import { CalculateSellOrderInput } from '../../../../models/request/calculate-order.input'
import { CalculateOrderOutput } from '../../../../models/response/calculate-order.output'
import { FeeServiceSymbol, IFeeService } from '../../../../services/fee.service'
import { CalculatorServiceSymbol, ICalculatorService } from '../../../../services/calculator.service'

@httpPost('/api/v2/calculate/order/sell', FireAccessMiddleware())
export class PostCalculateSellOrderFeeRoute extends Route {
  @inject(FeeServiceSymbol) feeService!: IFeeService

  @named('feesV2')
  @inject(FeeCalculatorServiceSymbol)
  feeCalculatorService!: IFeeCalculatorService

  @inject(ExchangeRateServiceSymbol) exchangeRateService!: IExchangeRateService
  @named('calculatorV2')
  @inject(CalculatorServiceSymbol)
  calculatorService!: ICalculatorService

  @OpenApiOperationPost({
    path: '/api/v2/calculate/order/sell',
    description: 'Calculate sell order totals',
    summary: 'Calculate sell order totals',
    security: [{ FireToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Calculate order input details',
        schema: CalculateSellOrderInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'Sell Order totals', content: CalculateOrderOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(CalculateSellOrderInput) body: CalculateSellOrderInput): Promise<void> {
    const effectiveExchangeRate = body.exchangeRate

    const [exchangeRate, fee] = await Promise.all([
      this.exchangeRateService.getLatestExchangeRate(),
      this.feeService.getFees(),
    ])

    const feeConfig = {
      flatFee: fee!.sellFlatFee,
      percentageFee: fee!.sellPercentageFee,
      agentFee: fee!.agentFeeAmountNgn,
      feeMultiplier: fee!.companyFeeMultiplier,
    }

    const calculatedOrder = await this.calculatorService.calculateSellUsdcTotals(
      {
        amount: body.amount,
        amountUsdc: body.amountUsdc,
      },
      {
        exchangeRate: effectiveExchangeRate,
        feeConfig: feeConfig,
      },
      this.feeCalculatorService,
      body.includeFees,
    )

    const feesExplainer = `Our withdraw fee is ${PERCENTAGE(
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
          value: exchangeRate.sellExchangeRate,
          valueFormatted: NGN(exchangeRate.sellExchangeRate, false),
          date: new Date(),
        },
      },
      calculatedItems: [
        {
          label: 'Amount Withdrawn',
          code: 'purchase_amount',
          value: calculatedOrder.calculatedPurchaseAmount,
          valueFormatted: NGN(calculatedOrder.calculatedPurchaseAmount, false),
        },
        {
          label: 'Fees',
          code: 'fee_total',
          value: calculatedOrder.fee.total,
          valueFormatted: NGN(calculatedOrder.fee.total, false),
        },
      ],
      messages: [{ message: feesExplainer, code: 'fee_explainer' }],
      includeFees: body.includeFees,
      amount: calculatedOrder.calculatedPurchaseAmount,
      amountUsdc: calculatedOrder.amountUsdc,
      feeTotal: calculatedOrder.fee.total,
      total: calculatedOrder.calculatedTotal,
    }

    return this.json(result, CalculateOrderOutput)
  }
}

2021

import { inject } from 'inversify'
import { httpGet, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationGet } from '@ts-awesome/openapi'

import { USDC } from '../../../utils/formatter'
import { CardIssueInfoOutput } from '../../../models/response'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'

import { CardServiceSymbol, ICardService } from '../../../services/dumb/card/card.service'
import { USDC_CURRENCY } from '../../../utils/calculator-utils'

@httpGet('/api/v1/card/issue-info', FireAccessMiddleware())
export class GetCardIssueInfoRoute extends Route {
  @inject(CardServiceSymbol) cardService!: ICardService

  @OpenApiOperationGet({
    path: '/api/v1/card/issue-info',
    description: 'Get card issue info',
    summary: 'GET card issue info',
    security: [{ FireToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Card Issue Info', content: CardIssueInfoOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const {
      creationFeeUsdc,
      creditFeeUsdc,
      maintenanceFeeUsdc,
      minRequiredBalanceForCreation,

      minFundAmountUsdc,
      maxFundAmountUsdc,
      minUnloadAmountUsdc,
      maxUnloadAmountUsdc,
    } = await this.cardService.getCardIssueCosts()

    const displayCreationFee = USDC(creationFeeUsdc, false)
    const displayFundFee = USDC(creditFeeUsdc, false)
    const displayTransactionFee = '1% per transaction (minimum $1, capped at $5)'
    const displayMaintenanceFee = USDC(maintenanceFeeUsdc, false)

    return this.json(
      {
        title: `Card creation costs ${displayCreationFee}!`,
        fees: [
          { label: 'Card funding', value: creditFeeUsdc, valueFormatted: `${displayFundFee}` },
          { label: 'Transaction', value: 0.01, valueFormatted: `${displayTransactionFee}` },
          {
            label: 'Card Maintenance',
            value: maintenanceFeeUsdc,
            valueFormatted: `${displayMaintenanceFee} monthly (only if card is used that month)`,
          },
        ],

        minFundAmountUsdc: minFundAmountUsdc,
        maxFundAmountUsdc: maxFundAmountUsdc,
        minUnloadAmountUsdc: minUnloadAmountUsdc,
        maxUnloadAmountUsdc: maxUnloadAmountUsdc,

        minBalanceRequired: minRequiredBalanceForCreation,
      } as CardIssueInfoOutput,
      CardIssueInfoOutput,
    )
  }
}

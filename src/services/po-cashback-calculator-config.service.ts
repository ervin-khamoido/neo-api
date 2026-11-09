import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { inject, injectable } from 'inversify'
import { IOrderEntityService, OrderEntityServiceSymbol, OrderType } from '../models/db'
import {
  IPOCashbackCalculatorConfigEntityService,
  POCashbackCalculatorConfigEntityServiceSymbol,
} from '../models/db/po-cashback-calculator-config.model'
import { ICashbackBuyConfig } from '../models/cashback/cashback-buy.config'

export interface IPOCashbackCalculatorConfigService {
  create(config: ICashbackBuyConfig, orderId: number): Promise<void>
}

export const POCashbackCalculatorConfigServiceSymbol = Symbol.for('IPOCashbackCalculatorConfigService')

@injectable()
export class POCashbackCalculatorConfigService implements IPOCashbackCalculatorConfigService {
  private logger: ILogger

  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(POCashbackCalculatorConfigEntityServiceSymbol)
  poCashbackCalculatorConfigEntityService!: IPOCashbackCalculatorConfigEntityService

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(POCashbackCalculatorConfigService)
  }

  async create(config: ICashbackBuyConfig, orderId: number): Promise<void> {
    const order = await this.orderEntityService.getOne({ id: orderId })

    if (!order || order.orderType !== OrderType.PurchaseOrder) {
      throw new Error('precondition failed: order not exists or has invalid type')
    }

    const existingPOCashbackCalculatorConfig = await this.poCashbackCalculatorConfigEntityService.getOne({ orderId })

    if (existingPOCashbackCalculatorConfig) {
      throw new Error('precondition failed: config for order already exist')
    }

    await this.poCashbackCalculatorConfigEntityService.addOne({
      orderId: orderId,
      externalUid: config.externalUid,
      details: { ...config },
    })
  }
}

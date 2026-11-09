import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { NotFoundError } from '@ts-awesome/rest'
import { ConfigSymbol } from '@ts-awesome/config'

import {
  IOnChainOrderEntityService,
  IOrderEntityService,
  IUserDetailsEntityService,
  OnChainOrderEntityServiceSymbol,
  OrderEntityServiceSymbol,
  UserDetailsEntityServiceSymbol,
} from '../../../../models/db'

import { USDC } from '../../../../utils/formatter'

import { IPushService, PushServiceSymbol } from '../../../push.service'
import { MailTemplates } from '../../../mailer/mailgun.service'
import { IMailerService, MailerServiceSymbol } from '../../../../lib/services/mailer'

export interface IOnChainNotificationService {
  notifyReceiveViaPush(orderId: number): Promise<void>
  notifyReceiveViaEmail(orderId: number): Promise<void>
}

export const OnChainNotificationServiceSymbol = Symbol.for('IOnChainNotificationService')

@injectable()
export class OnChainNotificationService implements IOnChainNotificationService {
  @inject(ConfigSymbol) config!: IConfig

  @inject(OrderEntityServiceSymbol) orderService!: IOrderEntityService
  @inject(OnChainOrderEntityServiceSymbol) onChainOrderService!: IOnChainOrderEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsService!: IUserDetailsEntityService

  @inject(PushServiceSymbol) pushService!: IPushService
  @inject(MailerServiceSymbol) mailerService!: IMailerService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(OnChainNotificationService)
  }

  async notifyReceiveViaPush(orderId: number): Promise<void> {
    const [order, onChainOrder] = await Promise.all([
      this.orderService.getOne({ id: orderId }),
      this.onChainOrderService.getOne({ orderId: orderId }),
    ])
    if (!order) {
      this.logger.error(`critical: order is not found id:${orderId}`)
      throw new NotFoundError('Order is not found')
    }
    if (!onChainOrder) {
      this.logger.error(`critical: on-chain order is not found id:${orderId}`)
      throw new NotFoundError('On-chain order is not found')
    }

    const displayAmount = USDC(onChainOrder.amountUsdc, false)

    await this.pushService.scheduleSend({
      userId: order.userId,
      showOnForeground: true,
      reason: 'on-chain:receive',
      payload: {
        version: 'v1',
        title: `You have received ${displayAmount} in your wallet`,
        body: `You just received ${displayAmount}. This has been added to your Neobank wallet.`,
      },
    })
  }

  async notifyReceiveViaEmail(orderId: number): Promise<void> {
    const neobankAppLink = this.config.get<string>('deepLinkHome')
    const [order, onChainOrder] = await Promise.all([
      this.orderService.getOne({ id: orderId }),
      this.onChainOrderService.getOne({ orderId: orderId }),
    ])
    if (!order) {
      this.logger.error(`critical: order is not found id:${orderId}`)
      throw new NotFoundError('Order is not found')
    }
    if (!onChainOrder) {
      this.logger.error(`critical: on-chain order is not found id:${orderId}`)
      throw new NotFoundError('On-chain order is not found')
    }

    const userDetails = await this.userDetailsService.getOne({ userId: order.userId })
    if (!userDetails) {
      this.logger.error(`critical: user is not found id:${order.userId}`)
      throw new NotFoundError('User is not found')
    }

    const displayAmount = USDC(onChainOrder.amountUsdc, false)

    await this.mailerService.send({
      to: userDetails.email,
      subject: `You have received ${displayAmount} in your wallet`,
      template: {
        name: MailTemplates.SendReceive_MoneyReceivedOnChain,
        variables: {
          receiver_first_name: userDetails.firstName ?? 'Friend',
          receive_amount_usdc: displayAmount,
          neobank_app_link: neobankAppLink ?? '',
        },
        conditionalContent: {
          neobank_app_link: !!neobankAppLink,
        },
      },
    })
  }
}

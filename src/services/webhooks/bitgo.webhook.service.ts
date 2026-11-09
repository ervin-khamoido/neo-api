2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { IAddressConfirmationPayload, ITransferPayload } from './models/bitgo.input'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { IOnChainService, OnChainServiceSymbol } from '../dumb/on-chain/on-chain.service'
import { IsolationLevel, of } from '@ts-awesome/orm'
import {
  IUserCryptoWalletEntityService,
  UserCryptoWalletEntityServiceSymbol,
} from '../../models/db/user-crypto-wallet.model'
import {
  IOnChainOrderEntityService,
  IOrderStatusEntityService,
  IUserEntityService,
  OnChainOrderEntityServiceSymbol,
  OnChainOrderStatus,
  OnChainOrderType,
  OrderModel,
  OrderStatusEntityServiceSymbol,
  UserEntityServiceSymbol,
} from '../../models/db'
import {
  IReceiveMoneyBusinessService,
  ReceiveMoneyBusinessServiceSymbol,
} from '../business/receive/receive-money.business.service'
import {
  IOnChainNotificationService,
  OnChainNotificationServiceSymbol,
} from '../dumb/on-chain/notification/on-chain-notification.service'

export interface IBitGoWebhookService {
  onAddressConfirmation(payload: IAddressConfirmationPayload): Promise<void>
  onTransfer(payload: ITransferPayload): Promise<void>
}

export const BitGoWebhookServiceSymbol = Symbol.for('IBitGoWebhookService')

@injectable()
export class BitGoWebhookService implements IBitGoWebhookService {
  @inject(ReceiveMoneyBusinessServiceSymbol) receiveMoneyBusinessService!: IReceiveMoneyBusinessService

  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(UserCryptoWalletEntityServiceSymbol) userCryptoWalletService!: IUserCryptoWalletEntityService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService

  @inject(OrderStatusEntityServiceSymbol) orderStatusEntityService!: IOrderStatusEntityService
  @inject(OnChainOrderEntityServiceSymbol) onChainOrderEntityService!: IOnChainOrderEntityService
  @inject(OnChainServiceSymbol) onChainService!: IOnChainService
  @inject(OnChainNotificationServiceSymbol) onChainNotificationService!: IOnChainNotificationService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(BitGoWebhookService)
  }

  async onAddressConfirmation(payload: IAddressConfirmationPayload): Promise<void> {
    const bitGoWalletId = await this.uow.auto(() => this.onChainService.confirmAddress(payload.address, payload))

    // Notify about incoming address update
    const user = await this.userCryptoWalletService.getOne({ id: bitGoWalletId })
    if (user) {
      await this.onChainService.notifyIncomingAddressUpdate(user.userId)
    }
  }

  async onTransfer(payload: ITransferPayload): Promise<void> {
    // The webhook may arrive faster than the transaction in DB is finished
    // it is unlikely to happen because the confirmation on-chain usually takes time
    // however, we must ensure it won't happen at all even in theory
    await this.uow.auto(async () => {
      await this.uow.setIsolationLevel(IsolationLevel.ReadUncommitted)
      await this.onChainOrderEntityService.getForUpdateByProviderTransferId(payload.transfer)
    })

    const orderId = await this.uow.auto(() => {
      return this.onChainService.onTransfer(payload.transfer, payload)
    })

    // notify user via push and email notification
    const [onChainOrder, orderStatus] = await Promise.all([
      this.onChainOrderEntityService.getOne({ orderId }),
      this.orderStatusEntityService.getOne({ orderId }),
    ])

    switch (onChainOrder?.type) {
      case OnChainOrderType.Receive: {
        if (orderStatus?.status === OnChainOrderStatus.Completed) {
          try {
            await Promise.all([
              this.onChainNotificationService.notifyReceiveViaPush(orderId),
              this.onChainNotificationService.notifyReceiveViaEmail(orderId),
            ])
          } catch (err: any) {
            this.logger.log(err)
          }
        }
      }
    }

    // trigger moving money from the user's incoming to saving (aka primary) wallet
    await this.triggerReceiveAfterTransfer(orderId)
  }

  private async triggerReceiveAfterTransfer(orderId: number): Promise<void> {
    const user = await this.userEntityService
      .select()
      .join(OrderModel, (root, other) => root.id.eq(other.userId))
      .where(() => of(OrderModel, 'id').eq(orderId))
      .fetchOne()
    if (!user) {
      this.logger.error(`unexpected: unable to find the user related to orderId:${orderId}`)
      return
    }

    await this.receiveMoneyBusinessService.notifyReceiveForUser(user)
  }
}

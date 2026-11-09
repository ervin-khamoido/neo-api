2021

import { inject } from 'inversify'
import { IConfig } from 'config'

import { httpPost, requestBody, RequestError, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { ConfigSymbol } from '@ts-awesome/config'
import { isNil } from 'lodash'
import { USDC } from '../../../../utils/formatter'

import { PostEntityOutput } from '../../../../models/response'
import { TransferOrderInput } from '../../../../models/request'
import {
  IOrderStatusEntityService,
  IUserDetailsEntityService,
  IWalletEntityService,
  OrderModel,
  OrderStatusEntityServiceSymbol,
  TransferOrderModel,
  TransferOrderStatus,
  UserDetailsEntityServiceSymbol,
  UserDetailsModel,
  UserModel,
  WalletEntityServiceSymbol,
} from '../../../../models/db'
import { ICreateTransferOrderInput } from '../../../../models/transfer'

import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { CurrentUserSymbol, OneTimeAccessMiddleware } from '../../../../middleware'

import { ITransferOrderService, TransferOrderServiceSymbol } from '../../../../services/transfer-order.service'
import { IUserBalanceService, UserBalanceServiceSymbol } from '../../../../services/user-balance.service'
import { IMailerService, MailerServiceSymbol, MailTemplates } from '../../../../lib/services/mailer'
import { IPushService, PushServiceSymbol } from '../../../../services/push.service'
import { ITOActivityService, TOActivityServiceSymbol } from '../../../../services/activity/to-activity.service'
import { IMoneyTransferService, MoneyTransferServiceSymbol } from '../../../../services/money-transfer.service'
import { OneTimeAction } from '../../../../services/pin-code.service'

@httpPost(
  '/api/v1/order/transfer',
  FireAccessMiddleware({ checkRevoked: true }),
  OneTimeAccessMiddleware({ action: OneTimeAction.CreateTransferOrder }),
)
export class PostCreateTransferOrderRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(UserDetailsEntityServiceSymbol) userDetailsService!: IUserDetailsEntityService
  @inject(OrderStatusEntityServiceSymbol)
  orderStatusEntityService!: IOrderStatusEntityService

  @inject(TransferOrderServiceSymbol) transferOrderService!: ITransferOrderService
  @inject(TOActivityServiceSymbol) toActivityService!: ITOActivityService
  @inject(UserBalanceServiceSymbol) userBalanceService!: IUserBalanceService
  @inject(MoneyTransferServiceSymbol) moneyTransferService!: IMoneyTransferService

  @inject(ConfigSymbol) config!: IConfig

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(PostCreateTransferOrderRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/order/transfer',
    description: 'Create an internal transfer order',
    summary: 'POST create an internal transfer order',
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        description: 'Transfer order information',
        schema: TransferOrderInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Successfully created transfer order', content: PostEntityOutput },
      [StatusCode.Forbidden]: { description: 'User cannot transfer money' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(TransferOrderInput) body: TransferOrderInput): Promise<void> {
    this.logger.info(
      `Received internal transfer request. Sender: ${this.user.uid}. Receiver: ${body.receiver}. Amount USDC: ${body.amountUsdc}.`,
    )

    // Verify user can send the requested amount, will throw error if they can't
    const actionApproval = await this.moneyTransferService.verifyUserCanSendAmount(this.user.id, body.amountUsdc)
    if (isNil(actionApproval.lockVersion)) {
      throw new RequestError(`Could not retrieve lock on the balance`, 'Server Error', StatusCode.ServerError)
    }

    // Create the transfer order
    const createTransferOrderInput: ICreateTransferOrderInput = {
      sender: this.user.uid,
      receiver: body.receiver,
      amountUsdc: body.amountUsdc,
      lockVersion: actionApproval.lockVersion,
    }
    const [order, transferOrder] = await this.uow.auto(() =>
      this.transferOrderService.createTransferOrder(createTransferOrderInput),
    )

    try {
      await this.uow.auto(() => this.toActivityService.createActivity(order, transferOrder))
    } catch (err: any) {
      this.logger.error(`critical: Failed to create activity for a transfer order ${order.uid}`)
      this.logger.error(err)
    }

    // notify if order status is completed
    const isOrderStatusCompleted = await this.orderStatusEntityService.exists({
      orderId: order.id,
      status: TransferOrderStatus.Completed,
    })
    if (isOrderStatusCompleted) {
      await Promise.all([
        this.notifySender(order, transferOrder),
        this.notifyReceiver(order, transferOrder),
        //
      ])
    }

    return this.json(order, StatusCode.Created, PostEntityOutput)
  }

  @inject(MailerServiceSymbol) mailer!: IMailerService
  @inject(PushServiceSymbol) pushService!: IPushService

  private async notifySender(order: OrderModel, transferOrder: TransferOrderModel): Promise<void> {
    const [senderDetails, receiverDetails] = await this.fetchSenderAndReceiverDetails(order, transferOrder)

    const senderUserId = senderDetails.userId
    const senderFirstName = senderDetails.firstName ?? 'Friend'
    const receiverUsername = receiverDetails.username ?? 'anonym'
    const displayAmountUsdc = USDC(transferOrder.amountUsdc, false)

    await this.pushService.scheduleSend({
      payload: {
        version: 'v1',
        title: 'You just sent money from your wallet',
        body:
          `@${receiverUsername} just received ${displayAmountUsdc} from you. ` +
          `This has been debited from your NeoBank wallet.`,
      },
      userId: senderUserId,
      reason: 'transfer_order:send_money',
    })

    const neoBankAppLink = this.config.get<string>('deepLinkHome')
    await this.mailer.send({
      to: senderDetails.email,
      subject: `You just sent ${displayAmountUsdc} from your wallet`,
      template: {
        name: MailTemplates.SendReceive_MoneySentOffChain,
        variables: {
          sender_first_name: senderFirstName,
          send_amount_usdc: displayAmountUsdc,
          receiver_username: receiverUsername,
          neo_bank_app_link: neoBankAppLink ?? '',
        },
        conditionalContent: {
          neo_bank_app_link: !!neoBankAppLink,
        },
      },
    })
  }

  private async notifyReceiver(order: OrderModel, transferOrder: TransferOrderModel): Promise<void> {
    const [senderDetails, receiverDetails] = await this.fetchSenderAndReceiverDetails(order, transferOrder)

    const receiverUserId = receiverDetails.userId
    const receiverFirstName = receiverDetails.firstName ?? 'Friend'
    const receiverEmail = receiverDetails.email
    const senderUsername = senderDetails.username ?? 'anonym'
    const displayAmountUsdc = USDC(transferOrder.amountUsdc, false)

    await this.pushService.scheduleSend({
      payload: {
        version: 'v1',
        title: 'You have received some money in your wallet',
        body: `@${senderUsername} just sent you ${displayAmountUsdc}. ` + `This has been added to your Neo Bank wallet.`,
      },
      userId: receiverUserId,
      reason: 'transfer_order:receive_money',
    })

    const neoBankAppLink = this.config.get<string>('deepLinkHome')
    await this.mailer.send({
      to: receiverEmail,
      subject: `You have received ${displayAmountUsdc} in your wallet`,
      template: {
        name: MailTemplates.SendReceive_MoneyReceivedOffChain,
        variables: {
          receiver_first_name: receiverFirstName,
          receive_amount_usdc: displayAmountUsdc,
          neobank_app_link: neobankAppLink ?? '',
        },
        conditionalContent: {
          neobank_app_link: !!neobankAppLink,
        },
      },
    })
  }

  private async fetchSenderAndReceiverDetails(
    order: OrderModel,
    transferOrder: TransferOrderModel,
  ): Promise<[UserDetailsModel, UserDetailsModel]> {
    const [senderDetails, receiverDetails] = await Promise.all([
      this.userDetailsService
        .select()
        .where(x => x.userId.eq(transferOrder.fromUserId))
        .fetchOne(UserDetailsModel),
      this.userDetailsService
        .select()
        .where(x => x.userId.eq(transferOrder.toUserId))
        .fetchOne(UserDetailsModel),
    ])

    if (!senderDetails) {
      throw new Error(`critical: sender details not found for transfer order ${order.uid}`)
    }
    if (!receiverDetails) {
      throw new Error(`critical: receiver details not found for transfer order ${order.uid}`)
    }

    return [senderDetails, receiverDetails]
  }
}

2021

import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { alias, not, of, sum } from '@ts-awesome/orm'
import { readable } from '@ts-awesome/model-reader'

import currency from 'currency.js'

import { inject, injectable } from 'inversify'

import {
  IOrderEntityService,
  IPurchaseOrderEntityService,
  ISellOrderEntityService,
  ITransferOrderEntityService,
  OrderEntityServiceSymbol,
  OrderModel,
  OrderStatusModel,
  OrderType,
  PurchaseOrderEntityServiceSymbol,
  PurchaseOrderStatus,
  SellOrderEntityServiceSymbol,
  SellOrderStatus,
  TransferOrderEntityServiceSymbol,
  TransferOrderModel,
  TransferOrderStatus,
  UserWalletModel,
} from '../models/db'
import { IUserOrderCountOutput } from '../models/order'
import { UserActionType } from '../models/limits'

import { IOrderConfigurationService, OrderConfigurationServiceSymbol } from './order-configuration.service'
import { USDC_PRECISION_CONFIG } from './calculator.service'

export interface IUserOrderService {
  getOpenOrderCounts(userId: number): Promise<IUserOrderCountOutput>
  getOpenPurchaseOrderCount(userId: number): Promise<number>
  getOpenSellOrderCount(userId: number): Promise<number>
  hasReachedMaxOpenedOrdersLimit(maxOpenedOrdersAllowed: number, openOrderCount: number): Promise<boolean>

  hasCompletePurchaseOrder(userId: number, excludedOrderIds: number[]): Promise<boolean>
  hasCompleteSellOrder(userId: number, excludedOrderIds: number[]): Promise<boolean>

  calculateOrdersTotal(orders: OrderTotalUsdc[], fromDate?: Date): Promise<number>
  getOpenAndCompletedOrdersByActionType(
    userId: number,
    actionType: UserActionType,
    endDate?: Date | null,
  ): Promise<OrderTotalUsdc[]>
  getSumOfOrdersForCombinedTurnover(userId: number): Promise<number>
}

export const UserOrderServiceSymbol = Symbol.for('IUserOrderService')

// The final Purchase Order statuses
export const closedPOStatuses = [
  PurchaseOrderStatus.Cancelled,
  PurchaseOrderStatus.CryptoCredited,
  PurchaseOrderStatus.PaymentNotReceived,
  PurchaseOrderStatus.Refunded,
]

// The final Sell Order statuses
export const closedSOStatuses = [
  SellOrderStatus.PaymentConfirmedByUser,
  SellOrderStatus.Refunded,
  SellOrderStatus.Cancelled,
]

// Successful Purchase Order statuses
export const completedPOStatuses = [PurchaseOrderStatus.CryptoCredited]

// Successful Sell Order statuses
export const completedSOStatuses = [SellOrderStatus.PaymentConfirmedByUser]

const openAndCompletePOStatuses = [
  PurchaseOrderStatus.Created,
  PurchaseOrderStatus.PaymentSent,
  PurchaseOrderStatus.CryptoCredited,
  PurchaseOrderStatus.Failed,
]

const openAndCompleteSOStatuses = [
  SellOrderStatus.Created,
  SellOrderStatus.TransferFailed,
  SellOrderStatus.CryptoTransferred,
  SellOrderStatus.PaymentSent,
  SellOrderStatus.PaymentConfirmedByUser,
  SellOrderStatus.RefundInitiated,
  SellOrderStatus.RefundFailed,
]

const openAndCompleteTOStatuses = [TransferOrderStatus.Created, TransferOrderStatus.Completed]

@injectable()
export class UserOrderService implements IUserOrderService {
  @inject(OrderEntityServiceSymbol) orderEntityService!: IOrderEntityService
  @inject(PurchaseOrderEntityServiceSymbol) purchaseOrderEntityService!: IPurchaseOrderEntityService
  @inject(SellOrderEntityServiceSymbol) sellOrderEntityService!: ISellOrderEntityService
  @inject(TransferOrderEntityServiceSymbol) transferOrderEntityService!: ITransferOrderEntityService

  @inject(OrderConfigurationServiceSymbol) orderConfigurationService!: IOrderConfigurationService

  private logger: ILogger
  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserOrderService)
  }

  async getOpenOrderCounts(userId: number): Promise<IUserOrderCountOutput> {
    const [openSellOrderCount, openPurchaseOrderCount] = await Promise.all([
      await this.getOpenSellOrderCount(userId),
      await this.getOpenPurchaseOrderCount(userId),
    ])

    const totalOpenOrderCount = openSellOrderCount + openPurchaseOrderCount

    return { totalOpenOrderCount, openPurchaseOrderCount, openSellOrderCount }
  }

  async getOpenPurchaseOrderCount(userId: number): Promise<number> {
    const openPurchaseOrderCount = await this.orderEntityService
      .select()
      .join(OrderStatusModel, (root, other) => root.id.eq(other.orderId))
      .where(x => x.userId.eq(userId))
      .where(x => x.orderType.eq(OrderType.PurchaseOrder))
      .where(() => not(of(OrderStatusModel, 'status').in(closedPOStatuses)))
      .count()

    return openPurchaseOrderCount
  }

  async getOpenSellOrderCount(userId: number): Promise<number> {
    const openSellOrderCount = await this.orderEntityService
      .select()
      .join(OrderStatusModel, (root, other) => root.id.eq(other.orderId))
      .where(x => x.userId.eq(userId))
      .where(x => x.orderType.eq(OrderType.SellOrder))
      .where(() => not(of(OrderStatusModel, 'status').in(closedSOStatuses)))
      .count()

    return openSellOrderCount
  }

  async hasReachedMaxOpenedOrdersLimit(maxOpenedOrdersAllowed: number, openOrderCount: number): Promise<boolean> {
    // Return false (the limit has not been reached) if the max allowed - open orders count is greater than 0 (can be reused for any order type)
    if (maxOpenedOrdersAllowed - openOrderCount > 0) {
      return false
    }

    return true
  }

  /**
   * Checks if the user has a complete purchase order (excluding the ones we want to ignore)
   * @param {number}  userId - The user's id
   * @param {number[]}  excludedOrderIds - Array of order IDs to exclude
   * @returns {boolean} True if they have complete purchase order(s), false otherwise
   */
  async hasCompletePurchaseOrder(userId: number, excludedOrderIds: number[]): Promise<boolean> {
    return await this.orderEntityService
      .select()
      .join(OrderStatusModel, (root, other) => root.id.eq(other.orderId))
      .where(x => not(x.id.in(excludedOrderIds)))
      .where(x => x.userId.eq(userId))
      .where(x => x.orderType.eq(OrderType.PurchaseOrder))
      .where(() => of(OrderStatusModel, 'status').in(completedPOStatuses))
      .exists()
  }

  /**
   * Checks if the user has a complete sell order (excluding the ones we want to ignore)
   * @param {number}  userId - The user's id
   * @param {number[]}  excludedOrderIds - Array of order IDs to exclude
   * @returns {boolean} True if they have complete sell order(s), false otherwise
   */
  async hasCompleteSellOrder(userId: number, excludedOrderIds: number[]): Promise<boolean> {
    return await this.orderEntityService
      .select()
      .join(OrderStatusModel, (root, other) => root.id.eq(other.orderId))
      .where(x => not(x.id.in(excludedOrderIds)))
      .where(x => x.userId.eq(userId))
      .where(x => x.orderType.eq(OrderType.SellOrder))
      .where(() => of(OrderStatusModel, 'status').in(completedSOStatuses))
      .exists()
  }

  /**
   * Gets an array of order totals for open and completed orders per user action type.
   * @param {number}  userId - ID of the user
   * @param {UserActionType}  actionType - The user action type
   * @param {Date} endDate - Determines if the array should be limited to orders from now up to endDate
   * @returns {OrderTotalUsdc[]} Array of base order information, including - ID, type, total USDC, etc.
   */
  async getOpenAndCompletedOrdersByActionType(
    userId: number,
    actionType: UserActionType,
    endDate?: Date | null,
  ): Promise<OrderTotalUsdc[]> {
    switch (actionType) {
      case UserActionType.PO: {
        const purchaseOrders = await this.getOpenAndCompletedPurchaseOrders(userId, endDate)
        return purchaseOrders
      }
      case UserActionType.SO: {
        const sellOrders = await this.getOpenAndCompletedSellOrders(userId, endDate)
        return sellOrders
      }
      case UserActionType.Send: {
        const senderTransferOrders = await this.getOpenAndCompletedTransferOrdersForSender(userId, endDate)
        return senderTransferOrders
      }
      case UserActionType.Receive: {
        const receiverTransferOrders = await this.getOpenAndCompletedTransferOrdersForReceiver(userId, endDate)
        return receiverTransferOrders
      }
      default: {
        this.logger.warn(`Unsupported action type received`)
      }
    }

    return []
  }

  async calculateOrdersTotal(orders: OrderTotalUsdc[], fromDate?: Date): Promise<number> {
    const filteredOrders = fromDate ? orders.filter(x => x.updatedAt >= fromDate) : orders

    return filteredOrders.reduce(
      (sum, x) => sum.add(x.totalUsdc),
      currency(0, { precision: USDC_PRECISION_CONFIG.decimalPlaces }),
    ).value
  }

  private async getOpenAndCompletedPurchaseOrders(userId: number, endDate?: Date | null): Promise<OrderTotalUsdc[]> {
    const purchaseOrdersQuery = await this.purchaseOrderEntityService
      .select()
      .columns(x => [
        x.orderId,
        of(OrderModel, 'orderType'),
        x.totalUsdc,
        of(OrderModel, 'referenceNumber'),
        of(OrderStatusModel, 'updatedAt'),
      ])
      .join(OrderModel, (root, other) => root.orderId.eq(other.id))
      .join(OrderStatusModel, (root, other) => root.orderId.eq(other.orderId))
      .where(() => of(OrderModel, 'userId').eq(userId))
      .where(() => of(OrderStatusModel, 'status').in(openAndCompletePOStatuses))

    const purchaseOrders = !!endDate
      ? await purchaseOrdersQuery.where(() => of(OrderStatusModel, 'updatedAt').gte(endDate)).fetch(OrderTotalUsdc)
      : await purchaseOrdersQuery.fetch(OrderTotalUsdc)

    return [...purchaseOrders]
  }

  private async getOpenAndCompletedSellOrders(userId: number, endDate?: Date | null): Promise<OrderTotalUsdc[]> {
    const sellOrdersQuery = this.sellOrderEntityService
      .select()
      .columns(x => [
        x.orderId,
        of(OrderModel, 'orderType'),
        x.totalUsdc,
        of(OrderModel, 'referenceNumber'),
        of(OrderStatusModel, 'updatedAt'),
      ])
      .join(OrderModel, (root, other) => root.orderId.eq(other.id))
      .join(OrderStatusModel, (root, other) => root.orderId.eq(other.orderId))
      .where(() => of(OrderModel, 'userId').eq(userId))
      .where(() => of(OrderStatusModel, 'status').in(openAndCompleteSOStatuses))

    const sellOrders = !!endDate
      ? await sellOrdersQuery.where(() => of(OrderStatusModel, 'updatedAt').gte(endDate)).fetch(OrderTotalUsdc)
      : await sellOrdersQuery.fetch(OrderTotalUsdc)

    return [...sellOrders]
  }

  /**
   * Gets transfer orders that are in an open or completed status for the sender (aka the user who SENT money and initiated the transfer order).
   * If an end date is provided, it gets the orders between the end date and present.
   * @param userId The sender's user ID
   * @param endDate The oldest date to get orders from (optional)
   * @returns The array of orders
   */
  private async getOpenAndCompletedTransferOrdersForSender(
    userId: number,
    endDate?: Date | null,
  ): Promise<OrderTotalUsdc[]> {
    const transferOrdersQuery = this.transferOrderEntityService
      .select()
      .columns(x => [
        x.orderId,
        of(OrderModel, 'orderType'),
        alias(x.amountUsdc, 'total_usdc'),
        of(OrderModel, 'referenceNumber'),
        of(OrderStatusModel, 'updatedAt'),
      ])
      .join(OrderModel, (root, other) => root.orderId.eq(other.id))
      .join(OrderStatusModel, (root, other) => root.orderId.eq(other.orderId))
      .where(() => of(OrderStatusModel, 'status').in(openAndCompleteTOStatuses))
      .where(x => x.fromUserId.eq(userId))

    const transferOrders = !!endDate
      ? await transferOrdersQuery.where(() => of(OrderStatusModel, 'updatedAt').gte(endDate)).fetch(OrderTotalUsdc)
      : await transferOrdersQuery.fetch(OrderTotalUsdc)

    return [...transferOrders]
  }

  /**
   * Gets transfer orders that are in an open or completed status for the receiver (aka the user who RECEIVED money from a transfer).
   * If an end date is provided, it gets the orders between the end date and present.
   * @param userId The receiver's user ID
   * @param endDate The oldest date to get orders from (optional)
   * @returns The array of orders
   */
  private async getOpenAndCompletedTransferOrdersForReceiver(
    userId: number,
    endDate?: Date | null,
  ): Promise<OrderTotalUsdc[]> {
    const transferOrdersQuery = this.transferOrderEntityService
      .select()
      .columns(x => [
        x.orderId,
        of(OrderModel, 'orderType'),
        alias(x.amountUsdc, 'total_usdc'),
        of(OrderModel, 'referenceNumber'),
        of(OrderStatusModel, 'updatedAt'),
      ])
      .join(OrderModel, (root, other) => root.orderId.eq(other.id))
      .join(OrderStatusModel, (root, other) => root.orderId.eq(other.orderId))
      .where(() => of(OrderStatusModel, 'status').in(openAndCompleteTOStatuses))
      .where(x => x.toUserId.eq(userId))

    const transferOrders = !!endDate
      ? await transferOrdersQuery.where(() => of(OrderStatusModel, 'updatedAt').gte(endDate)).fetch(OrderTotalUsdc)
      : await transferOrdersQuery.fetch(OrderTotalUsdc)

    return [...transferOrders]
  }

  /**
   * Gets the sum of the total USDC amounts for ALL (lifetime) open and completed deposits + receives for a user
   * @param userId The user ID
   * @returns The sum (of total USDC) of all deposits + receives
   */
  async getSumOfOrdersForCombinedTurnover(userId: number): Promise<number> {
    // Get lifetime deposits total
    const purchaseOrdersSumPromise = this.purchaseOrderEntityService
      .select()
      .columns(x => [alias(sum(x.totalUsdc), 'amount')])
      .join(OrderModel, (root, other) => root.orderId.eq(other.id))
      .join(OrderStatusModel, (root, other) => root.orderId.eq(other.orderId))
      .where(() => of(OrderModel, 'userId').eq(userId))
      .where(() => of(OrderStatusModel, 'status').in(openAndCompletePOStatuses))
      .fetchOne(TotalUsdc)

    // Get lifetime receives total
    const transferOrdersSumPromise = this.transferOrderEntityService
      .select()
      .columns(x => [alias(sum(x.amountUsdc), 'amount')])
      .join(OrderStatusModel, (root, other) => root.orderId.eq(other.orderId))
      .where(() => of(OrderStatusModel, 'status').in(openAndCompleteTOStatuses))
      .where(x => x.toUserId.eq(userId))
      .fetchOne(TotalUsdc)

    const [purchaseOrderSum, transferOrderSum] = await Promise.all([purchaseOrdersSumPromise, transferOrdersSumPromise])

    // If no value, set to 0
    const poTotal = purchaseOrderSum?.amount ?? 0
    const toTotal = transferOrderSum?.amount ?? 0

    // Add the totals for lifetime receives + deposits
    const lifetimeTotalUsdc = currency(poTotal, { precision: USDC_PRECISION_CONFIG.decimalPlaces }).add(toTotal)

    return lifetimeTotalUsdc.value
  }
}

class TotalUsdc {
  @readable(Number, true) amount!: number | null
}

export class OrderTotalUsdc {
  @readable('order_id', Number) orderId!: number
  @readable('order_type', String) orderType!: string
  @readable('total_usdc', Number) totalUsdc!: number
  @readable('reference_number', String) referenceNumber!: string
  @readable('updated_at', Date) updatedAt!: Date
}

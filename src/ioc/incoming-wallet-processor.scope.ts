2021

import { Container, interfaces } from 'inversify'
import * as pg from 'pg'
import config, { IConfig } from 'config'

import { ISqlQuery, PgCompiler, PgDriver } from '@ts-awesome/orm-pg'
import {
  ConfigSymbol,
  ILoggerDriver,
  ILoggerFactory,
  Logger,
  LoggerDriverSymbol,
  LoggerFactorySymbol,
  setup as setupLogger,
} from '@ts-awesome/logger'
import { IBuildableQueryCompiler, IQueryDriver, Symbols as OrmSymbols, TableMetaProvider } from '@ts-awesome/orm'
import { EntityService, IEntityService, IQueryExecutorProvider, IUnitOfWork, UnitOfWork } from '@ts-awesome/entity'
import { Symbols as EntitySymbols } from '@ts-awesome/entity/dist/symbols'

import { IRedisConfig, RedisConfig, RedisConfigSymbol } from '../lib/models/config'
import {
  ModernTreasuryWalletModel,
  OrderConfigurationModel,
  OrderModel,
  PurchaseOrderModel,
  SellOrderModel,
  TransferOrderModel,
  UserBankAccountModel,
  UserDetailsEntityService,
  UserDetailsModel,
  UserKYCProviderVerificationModel,
  UserLevel,
  UserLevelLimitModel,
  UserLevelModel,
  UserModel,
  UserSecretsModel,
  UserSettingsModel,
  UserWalletModel,
  WalletModel,
} from '../models/db'

import { WorkerFactory, WorkerFactorySymbol } from '../microservice/common/worker.factory'
import { Queue, Worker } from 'bullmq'
import {
  IKeyValueStorageService,
  KeyValueStorageProvider,
  KeyValueStorageServiceSymbol,
  LocalStorageService,
  RedisService,
} from '../lib/services/key-value-storage'
import Redis from 'ioredis'
import {
  AppConfig,
  AppConfigSymbol,
  CacheConfig,
  CacheConfigSymbol,
  IAppConfig,
  ICacheConfig,
  IModernTreasuryConfig,
  ModernTreasuryConfig,
  ModernTreasuryConfigSymbol,
} from '../models/config'
import {
  IModernTreasuryService,
  ModernTreasuryService,
  ModernTreasuryServiceSymbol,
} from '../services/modern-treasury.service'
import { HttpTransport, HttpTransportSymbol, IHttpTransport } from '@ts-awesome/request'
import { IUserLimitService, UserLimitService, UserLimitServiceSymbol } from '../services/user-limit.service'
import {
  IUserLevelLimitService,
  UserLevelLimitService,
  UserLevelLimitServiceSymbol,
} from '../services/user-level-limit.service'
import { IUserOrderService, UserOrderService, UserOrderServiceSymbol } from '../services/user-order.service'
import { IUserBalanceService, UserBalanceService, UserBalanceServiceSymbol } from '../services/user-balance.service'
import {
  IOrderConfigurationService,
  OrderConfigurationService,
  OrderConfigurationServiceSymbol,
} from '../services/order-configuration.service'
import { IWalletService, WalletService, WalletServiceSymbol } from '../services/wallet.service'
import {
  IReceiveMoneyBusinessService,
  ReceiveMoneyBusinessService,
  ReceiveMoneyBusinessServiceSymbol,
} from '../services/business/receive/receive-money.business.service'
import {
  IMoneyTransferService,
  MoneyTransferService,
  MoneyTransferServiceSymbol,
} from '../services/money-transfer.service'
import { IUserStatusService, UserStatusService, UserStatusServiceSymbol } from '../services/user-status.service'
import { IUserSettingsService, UserSettingsService, UserSettingsServiceSymbol } from '../services/user-settings.service'
import { IUserSecretsService, UserSecretsService, UserSecretsServiceSymbol } from '../services/user-secrets.service'
import { IUserLevelService, UserLevelService, UserLevelServiceSymbol } from '../services/level/user-level.service'
import {
  IUserLevelInfoFactory,
  userLevelInfoFactory,
  UserLevelInfoFactorySymbol,
} from '../services/level/user-level-info.factory'
import { DefaultQueueOptions, EventQueueOptions, EventQueueSymbol } from '../utils/event-queue'
import { IncomingWalletProcessorQueue } from '../microservice/incoming-wallet-processor/model/queue.config'

export function setupIncomingWalletProcessor(container: Container): void {
  // configs
  container.bind<IConfig>(ConfigSymbol).toConstantValue(config)
  container.bind<IRedisConfig>(RedisConfigSymbol).to(RedisConfig).inSingletonScope()
  container.bind<ICacheConfig>(CacheConfigSymbol).to(CacheConfig).inSingletonScope()
  container.bind<IModernTreasuryConfig>(ModernTreasuryConfigSymbol).to(ModernTreasuryConfig).inSingletonScope()
  container.bind<IAppConfig>(AppConfigSymbol).to(AppConfig).inSingletonScope()

  // logger
  setupLogger(container)
  // const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)

  // db
  const sqlConfig = config.get<pg.PoolConfig>('dbConfig')
  const pool = new pg.Pool(sqlConfig)

  container.bind<IQueryDriver<ISqlQuery>>(OrmSymbols.SqlQueryDriver).toDynamicValue(() => new PgDriver(pool as any))
  container.bind<IBuildableQueryCompiler<ISqlQuery>>(OrmSymbols.SqlQueryBuilder).to(PgCompiler)

  // unit of work
  container
    .bind<IUnitOfWork<ISqlQuery>>(EntitySymbols.UnitOfWork)
    .toDynamicValue(({ container }) => {
      const driver = container.get<IQueryDriver<ISqlQuery>>(OrmSymbols.SqlQueryDriver)
      return new UnitOfWork<ISqlQuery>(driver)
    })
    .inSingletonScope()

  // entity services
  bindEntityServices(
    container,
    //
    UserModel,
    WalletModel,
    UserWalletModel,
    ModernTreasuryWalletModel,
    UserLevelLimitModel,
    OrderModel,
    PurchaseOrderModel,
    SellOrderModel,
    OrderConfigurationModel,
    TransferOrderModel,
    UserSettingsModel,
    UserSecretsModel,
    UserLevelModel,
    UserBankAccountModel,
    UserKYCProviderVerificationModel,
  )
  bindCustomEntityService(container, UserDetailsModel, UserDetailsEntityService)

  // services
  container.bind<IModernTreasuryService>(ModernTreasuryServiceSymbol).to(ModernTreasuryService)
  container.bind<IUserLimitService>(UserLimitServiceSymbol).to(UserLimitService)
  container.bind<IUserLevelLimitService>(UserLevelLimitServiceSymbol).to(UserLevelLimitService)
  container.bind<IUserOrderService>(UserOrderServiceSymbol).to(UserOrderService)
  container.bind<IUserBalanceService>(UserBalanceServiceSymbol).to(UserBalanceService)
  container.bind<IOrderConfigurationService>(OrderConfigurationServiceSymbol).to(OrderConfigurationService)
  container.bind<IWalletService>(WalletServiceSymbol).to(WalletService)
  container.bind<IReceiveMoneyBusinessService>(ReceiveMoneyBusinessServiceSymbol).to(ReceiveMoneyBusinessService)
  container.bind<IMoneyTransferService>(MoneyTransferServiceSymbol).to(MoneyTransferService)
  container.bind<IUserStatusService>(UserStatusServiceSymbol).to(UserStatusService)
  container.bind<IUserSettingsService>(UserSettingsServiceSymbol).to(UserSettingsService)
  container.bind<IUserSecretsService>(UserSecretsServiceSymbol).to(UserSecretsService)
  container.bind<IUserLevelService>(UserLevelServiceSymbol).to(UserLevelService)
  container.bind<IUserLevelInfoFactory>(UserLevelInfoFactorySymbol).toFactory(userLevelInfoFactory)
  container
    .bind<WorkerFactory>(WorkerFactorySymbol)
    .toFactory(() => (name, processor, options) => new Worker(name, processor, options))

  // redis, bullmq
  container
    .bind<IKeyValueStorageService>(KeyValueStorageServiceSymbol)
    .toDynamicValue(() => {
      const provider = container.get<IConfig>(ConfigSymbol).get<KeyValueStorageProvider>('keyValueStorageProvider')
      const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)

      switch (provider) {
        case KeyValueStorageProvider.Redis: {
          const redisConfig = container.get<IRedisConfig>(RedisConfigSymbol)
          const redis = new Redis(redisConfig)

          return new RedisService(redis, loggerFactory)
        }
        default:
          return new LocalStorageService()
      }
    })
    .inSingletonScope()

  container
    .bind<Queue>(EventQueueSymbol)
    .toDynamicValue(() => {
      const redisConfig = container.get<IRedisConfig>(RedisConfigSymbol)
      const queueName = IncomingWalletProcessorQueue
      const queueOptions = EventQueueOptions[queueName] ?? DefaultQueueOptions

      return new Queue(queueName, { ...queueOptions, connection: redisConfig })
    })
    .inSingletonScope()
    .whenTargetNamed(IncomingWalletProcessorQueue)

  container
    .bind<IHttpTransport>(HttpTransportSymbol)
    .toDynamicValue(() => {
      // const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
      // const logger = loggerFactory(HttpTransport)
      const loggerDriver = container.get<ILoggerDriver>(LoggerDriverSymbol)
      const logger = new Logger(HttpTransport.name, (level, prefix, message, dataMethod, dataUrl, __skipHeaders) => {
        // headers is the 3d param so we should not pass it down
        loggerDriver(level, prefix, message, dataMethod, dataUrl)
      })

      const config = container.get<IModernTreasuryConfig>(ModernTreasuryConfigSymbol)
      const basicAuth = Buffer.from(`${config.organizationId}:${config.key}`).toString('base64')

      return new HttpTransport(logger, config.url, () => `Basic ${basicAuth}`)
    })
    .whenTargetNamed('modern-treasury')
}

function bindEntityServices(container: Container, ...DBModels: TableMetaProvider[]): void {
  for (const DBModel of DBModels) {
    const executorProvider = container.get<IQueryExecutorProvider<ISqlQuery>>(EntitySymbols.UnitOfWork)
    const queryBuilder = container.get<IBuildableQueryCompiler<ISqlQuery>>(OrmSymbols.SqlQueryBuilder)

    container
      .bind<IEntityService<unknown, never, never, never>>(EntitySymbols.serviceFor(DBModel))
      .toConstantValue(new EntityService(DBModel, executorProvider, queryBuilder))
  }
}

function bindCustomEntityService<T>(
  container: Container,
  Model: TableMetaProvider<T>,
  Service: interfaces.Newable<EntityService<T, any, any, any, any>>,
) {
  const executorProvider = container.get<IQueryExecutorProvider<ISqlQuery>>(EntitySymbols.UnitOfWork)
  const queryBuilder = container.get<IBuildableQueryCompiler<ISqlQuery>>(OrmSymbols.SqlQueryBuilder)

  container
    .bind<IEntityService<unknown, never, never, never>>(EntitySymbols.serviceFor(Model))
    .toConstantValue(new Service(Model, executorProvider, queryBuilder))
}

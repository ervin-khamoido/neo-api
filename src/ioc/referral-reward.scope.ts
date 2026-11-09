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

import {
  IMailgunConfig,
  IRedisConfig,
  MailgunConfig,
  MailgunConfigSymbol,
  RedisConfig,
  RedisConfigSymbol,
} from '../lib/models/config'

import {
  ActivityModel,
  ActivityStatusModel,
  AmbassadorLevelModel,
  ModernTreasuryWalletModel,
  OrderConfigurationModel,
  OrderModel,
  OrderStatusEntityService,
  OrderStatusModel,
  PurchaseOrderModel,
  ReferralLevelModel,
  RewardOrderModel,
  TransactionModel,
  TransactionStatusModel,
  UserAmbassadorModel,
  UserBaNameMatchLogModel,
  UserBankAccountModel,
  UserDetailsEntityService,
  UserDetailsModel,
  UserModel,
  UserReferrerEntityService,
  UserReferrerModel,
  UserReferrerPayoutEntityService,
  UserReferrerPayoutModel,
  UserSecretsModel,
  UserSettingsModel,
  UserWalletModel,
  WalletModel,
} from '../models/db'

import {
  IUserReferrerService,
  UserReferrerService,
  UserReferrerServiceSymbol,
} from '../services/referrals/user-referrer.service'
import {
  IReferralCondition,
  ReferralConditionFactorySymbol,
} from '../microservice/referral-reward/conditions/referral-condition'
import {
  ReferralConditionV1,
  ReferralConditionV1Name,
} from '../microservice/referral-reward/conditions/referral-condition.v1'
import {
  IUserReferrerPayoutService,
  UserReferrerPayoutService,
  UserReferrerPayoutServiceSymbol,
} from '../services/referrals/user-referrer-payout.service'
import { Queue, Worker } from 'bullmq'
import {
  IKeyValueStorageService,
  KeyValueStorageProvider,
  KeyValueStorageServiceSymbol,
  LocalStorageService,
  RedisService,
} from '../lib/services/key-value-storage'
import Redis from 'ioredis'
import { ExchangeRateService, ExchangeRateServiceSymbol, IExchangeRateService } from '../services/exchange-rate.service'
import { AirtableService, AirtableServiceSymbol, IAirtableService } from '../services/airtable.service'
import {
  AirtableConfig,
  AirtableConfigSymbol,
  AppConfig,
  AppConfigSymbol,
  BranchIOConfig,
  BranchIOConfigSymbol,
  CacheConfig,
  CacheConfigSymbol,
  IAirtableConfig,
  IAppConfig,
  IBranchIOConfig,
  ICacheConfig,
  IModernTreasuryConfig,
  IReferralConfig,
  ISumsubConfig,
  ISupportConfig,
  ModernTreasuryConfig,
  ModernTreasuryConfigSymbol,
  ReferralConfig,
  ReferralConfigSymbol,
  SumsubConfig,
  SumsubConfigSymbol,
  SupportConfig,
  SupportConfigSymbol,
} from '../models/config'
import { ExchangeRateModel } from '../models/db/exchange-rate.model'
import {
  IRewardOrderService,
  RewardOrderService,
  RewardOrderServiceSymbol,
} from '../services/reward/reward-order.service'
import { IROStatusService, ROStatusService, ROStatusServiceSymbol } from '../services/ro-status.service'
import { ActivityService, ActivityServiceSymbol, IActivityService } from '../services/activity/activity.service'
import {
  IOrderConfigurationService,
  OrderConfigurationService,
  OrderConfigurationServiceSymbol,
} from '../services/order-configuration.service'
import { IWalletService, WalletService, WalletServiceSymbol } from '../services/wallet.service'
import {
  IModernTreasuryService,
  ModernTreasuryService,
  ModernTreasuryServiceSymbol,
} from '../services/modern-treasury.service'
import { HttpTransport, HttpTransportSymbol, IHttpTransport } from '@ts-awesome/request'
import {
  ITransactionService,
  TransactionService,
  TransactionServiceSymbol,
} from '../services/transaction/transaction.service'
import {
  ITransactionStatusService,
  TransactionStatusService,
  TransactionStatusServiceSymbol,
} from '../services/transaction/transaction-status.service'
import {
  ConsoleMailerService,
  IMailerService,
  MailerProvider,
  MailerServiceSymbol,
  MailgunService,
} from '../lib/services/mailer'
import { IPushService, PushService, PushServiceSymbol } from '../services/push.service'
import { UserPushModel } from '../models/db/user-push.model'
import { IUserBalanceService, UserBalanceService, UserBalanceServiceSymbol } from '../services/user-balance.service'
import { CalculatorServiceSymbol, CalculatorV2Service, ICalculatorService } from '../services/calculator.service'
import { IMailTemplateService, MailTemplateService, MailTemplateServiceSymbol } from '../services/mailer'
import { BranchIOService, BranchIOServiceSymbol, IBranchIOService } from '../services/branch.service'
import { IUserStatusService, UserStatusService, UserStatusServiceSymbol } from '../services/user-status.service'
import { IUserSettingsService, UserSettingsService, UserSettingsServiceSymbol } from '../services/user-settings.service'
import { IUserSecretsService, UserSecretsService, UserSecretsServiceSymbol } from '../services/user-secrets.service'
import { AmbassadorService, AmbassadorServiceSymbol, IAmbassadorService } from '../services/ambassador.service'
import { WorkerFactory, WorkerFactorySymbol } from '../microservice/common/worker.factory'
import { DefaultQueueOptions, EventQueueOptions, EventQueueSymbol } from '../utils/event-queue'
import { PushQueueV1 } from '../microservice/push/common'
import { IUsernameConfig, UsernameConfig, UsernameConfigSymbol } from '../models/config/username.config'
import {
  IUserFullNameService,
  UserFullNameService,
  UserFullNameServiceSymbol,
} from '../services/user-full-name.service'
import {
  IUserBaNameMatchLogService,
  UserBaNameMatchLogService,
  UserBaNameMatchLogServiceSymbol,
} from '../services/bank-account/user-ba-name-match-log.service'
import {
  createRewardNotificationFactory,
  RewardNotificationFactorySymbol,
} from '../services/reward/notifications/reward-notification.factory'

export function setupReferralRewardContainer(container: Container): void {
  // configs
  container.bind<IConfig>(ConfigSymbol).toConstantValue(config)
  container.bind<IAppConfig>(AppConfigSymbol).to(AppConfig).inSingletonScope()
  container.bind<IRedisConfig>(RedisConfigSymbol).to(RedisConfig).inSingletonScope()
  container.bind<IAirtableConfig>(AirtableConfigSymbol).to(AirtableConfig).inSingletonScope()
  container.bind<IModernTreasuryConfig>(ModernTreasuryConfigSymbol).to(ModernTreasuryConfig).inSingletonScope()
  container.bind<IMailgunConfig>(MailgunConfigSymbol).to(MailgunConfig).inSingletonScope()
  container.bind<ISupportConfig>(SupportConfigSymbol).to(SupportConfig).inSingletonScope()
  container.bind<IBranchIOConfig>(BranchIOConfigSymbol).to(BranchIOConfig).inSingletonScope()
  container.bind<ICacheConfig>(CacheConfigSymbol).to(CacheConfig).inSingletonScope()
  container.bind<IReferralConfig>(ReferralConfigSymbol).to(ReferralConfig).inSingletonScope()
  container.bind<IUsernameConfig>(UsernameConfigSymbol).to(UsernameConfig).inSingletonScope()
  container.bind<ISumsubConfig>(SumsubConfigSymbol).to(SumsubConfig).inSingletonScope()
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
    OrderModel,
    PurchaseOrderModel,
    ExchangeRateModel,
    RewardOrderModel,
    ActivityModel,
    ActivityStatusModel,
    UserBankAccountModel,
    OrderConfigurationModel,
    ModernTreasuryWalletModel,
    TransactionModel,
    TransactionStatusModel,
    UserPushModel,
    UserSettingsModel,
    UserSecretsModel,
    ReferralLevelModel,
    UserAmbassadorModel,
    AmbassadorLevelModel,
    WalletModel,
    UserWalletModel,
    UserBaNameMatchLogModel,
  )
  bindCustomEntityService(container, UserDetailsModel, UserDetailsEntityService)
  bindCustomEntityService(container, OrderStatusModel, OrderStatusEntityService)
  bindCustomEntityService(container, UserReferrerPayoutModel, UserReferrerPayoutEntityService)
  bindCustomEntityService(container, UserReferrerModel, UserReferrerEntityService)

  // services
  container.bind<IBranchIOService>(BranchIOServiceSymbol).to(BranchIOService)
  container.bind<IUserReferrerService>(UserReferrerServiceSymbol).to(UserReferrerService)
  container.bind<IUserReferrerPayoutService>(UserReferrerPayoutServiceSymbol).to(UserReferrerPayoutService)
  container.bind<IExchangeRateService>(ExchangeRateServiceSymbol).to(ExchangeRateService)
  container.bind<IAirtableService>(AirtableServiceSymbol).to(AirtableService)
  container.bind<IRewardOrderService>(RewardOrderServiceSymbol).to(RewardOrderService)
  container.bind<IROStatusService>(ROStatusServiceSymbol).to(ROStatusService)
  container.bind<IActivityService>(ActivityServiceSymbol).to(ActivityService)
  container.bind<IOrderConfigurationService>(OrderConfigurationServiceSymbol).to(OrderConfigurationService)
  container.bind<IWalletService>(WalletServiceSymbol).to(WalletService)
  container.bind<IModernTreasuryService>(ModernTreasuryServiceSymbol).to(ModernTreasuryService)
  container.bind<ITransactionService>(TransactionServiceSymbol).to(TransactionService)
  container.bind<ITransactionStatusService>(TransactionStatusServiceSymbol).to(TransactionStatusService)
  container.bind<IPushService>(PushServiceSymbol).to(PushService)
  container.bind<IUserBalanceService>(UserBalanceServiceSymbol).to(UserBalanceService)
  container.bind<IUserStatusService>(UserStatusServiceSymbol).to(UserStatusService)
  container.bind<IUserSettingsService>(UserSettingsServiceSymbol).to(UserSettingsService)
  container.bind<IUserSecretsService>(UserSecretsServiceSymbol).to(UserSecretsService)
  container.bind<IAmbassadorService>(AmbassadorServiceSymbol).to(AmbassadorService)
  container.bind<IMailTemplateService>(MailTemplateServiceSymbol).to(MailTemplateService)
  container.bind<IUserFullNameService>(UserFullNameServiceSymbol).to(UserFullNameService)
  container.bind<IUserBaNameMatchLogService>(UserBaNameMatchLogServiceSymbol).to(UserBaNameMatchLogService)
  container.bind(RewardNotificationFactorySymbol).toFactory(createRewardNotificationFactory)

  // http transports
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

      const branchIOConfig = container.get<IBranchIOConfig>(BranchIOConfigSymbol)

      return new HttpTransport(logger, branchIOConfig.url)
    })
    .whenTargetNamed('branchio')

  // other
  container.bind<IReferralCondition<unknown>>(ReferralConditionFactorySymbol).toFactory(() => version => {
    switch (version) {
      case ReferralConditionV1Name:
        return container.resolve(ReferralConditionV1)
      default:
        return null
    }
  })

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
  bindQueues(container)

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
  container.bind<IMailerService>(MailerServiceSymbol).toDynamicValue(({ container }) => {
    const provider = container.get<IConfig>(ConfigSymbol).get<MailerProvider>('mailerProvider')

    switch (provider) {
      case MailerProvider.Mailgun:
        return container.resolve(MailgunService)
      case MailerProvider.Console:
      default:
        return container.resolve(ConsoleMailerService)
    }
  })
  container
    .bind<ICalculatorService>(CalculatorServiceSymbol)
    .to(CalculatorV2Service)
    .inSingletonScope()
    .whenTargetNamed('calculatorV2')

  container
    .bind<WorkerFactory>(WorkerFactorySymbol)
    .toFactory(() => (name, processor, options) => new Worker(name, processor, options))
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

function bindQueues(container: Container) {
  container
    .bind<Queue>(EventQueueSymbol)
    .toDynamicValue(() => {
      const redisConfig = container.get<IRedisConfig>(RedisConfigSymbol)
      const queueName = PushQueueV1
      const queueOptions = EventQueueOptions[queueName] ?? DefaultQueueOptions

      return new Queue(queueName, { ...queueOptions, connection: redisConfig })
    })
    .inSingletonScope()
    .whenTargetNamed(PushQueueV1)
}

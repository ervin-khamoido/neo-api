2021

import { Container, interfaces } from 'inversify'
import * as pg from 'pg'
import config, { IConfig } from 'config'
import Redis from 'ioredis'
import { Sanitizer, Symbols as RestSymbols } from '@ts-awesome/rest'
import { ISqlQuery, PgCompiler, PgDriver } from '@ts-awesome/orm-pg'
import {
  ConfigSymbol,
  ILoggerConfig,
  ILoggerFactory,
  LoggerFactorySymbol,
  setup as setupLogger,
} from '@ts-awesome/logger'
import { setupExtendedLogger } from '../logging/extended-logger'
import { IBuildableQueryCompiler, IQueryDriver, Symbols as OrmSymbols } from '@ts-awesome/orm'
import { IValidator, ModelValidator, presence, SingleValidator, uuid, ValidatorSymbol } from '@ts-awesome/validate'
import { IProfilingSession, ProfilingSessionSymbol } from '@ts-awesome/profiler'
import { Queue } from 'bullmq'

import {
  AuthTokenConfig,
  AuthTokenConfigSymbol,
  ConfirmTokenConfig,
  ConfirmTokenConfigSymbol,
  IRedisConfig,
  ITokenConfig,
  ITwilioConfig,
  IVerificationConfig,
  PinTokenConfig,
  PinTokenConfigSymbol,
  RedisConfig,
  RedisConfigSymbol,
  TwilioConfig,
  TwilioConfigSymbol,
  VerificationConfig,
  VerificationConfigSymbol,
} from '../lib/models/config'

import { ErrorHandlerMiddleware, ErrorHandlerMiddlewareSymbol } from '../middleware'
import validation from '../lib/utils/validation'

import {
  EmailInput,
  EmailVerifyInput,
  InviteInput,
  PushSubscribeInput,
  PushUnsubscribeInput,
  ReferrerVerifyInput,
  SignInInput,
  SignUpInput,
  SupportInput,
  UserDefaultCurrencyInput,
  UpdateReferralCodeInput,
  AddressInput,
  SignUpV2Input,
  WaitlistFeatureInput,
  UserWaitlistInput,
} from '../models/request'
import { ProfilingPgDriver } from '../lib/profiling-pg-driver'

import {
  IKeyValueStorageService,
  KeyValueStorageProvider,
  KeyValueStorageServiceSymbol,
  LocalStorageService,
  RedisService,
} from '../lib/services/key-value-storage'
import {
  AirtableConfig,
  AirtableConfigSymbol,
  BranchIOConfig,
  BranchIOConfigSymbol,
  IAirtableConfig,
  IBranchIOConfig,
  AppConfig,
  AppConfigSymbol,
  IAppConfig,
  IFreshdeskConfig,
  FreshdeskConfigSymbol,
  FreshdeskConfig,
  IConfigurationApiConfig,
  ConfigurationApiConfig,
  ConfigurationApiConfigSymbol,
  PaystackConfigSymbol,
  IPaystackConfig,
  PaystackConfig,
  PhoneListConfigSymbol,
  IPhoneListConfig,
  PhoneListConfig,
  ModernTreasuryConfig,
  ModernTreasuryConfigSymbol,
  IModernTreasuryConfig,
  OperationsApiConfig,
  OperationsApiConfigSymbol,
  IOperationsApiConfig,
  ICacheConfig,
  CacheConfig,
  CacheConfigSymbol,
  SupportConfig,
  SupportConfigSymbol,
  ISupportConfig,
  IDashboardApiConfig,
  DashboardApiConfigSymbol,
  DashboardApiConfig,
  IReferralConfig,
  ReferralConfigSymbol,
  ReferralConfig,
  ISumsubConfig,
  SumsubConfigSymbol,
  SumsubConfig,
  BridgeCardConfig,
  IBridgeCardConfig,
  BridgeCardConfigSymbol,
  IIdentityConfig,
  IdentityConfigSymbol,
  IdentityConfig,
  PhoneConfig,
  IPhoneConfig,
  PhoneConfigSymbol,
} from '../models/config'
import { IMailgunConfig, MailgunConfigSymbol, MailgunConfig } from '../lib/models/config'
import { AirtableService, AirtableServiceSymbol, IAirtableService } from '../services/airtable.service'
import {
  CalculatorService,
  CalculatorServiceSymbol,
  CalculatorV2Service,
  ICalculatorService,
} from '../services/calculator.service'
import {
  DateFormatterService,
  DateFormatterServiceSymbol,
  IDateFormatterService,
} from '../services/date-formatter.service'
import { PhoneValidator } from '../validation'
import { FeatureConfig, FeatureConfigSymbol, IFeatureConfig } from '../models/config/feature.config'
import { BuildNumberConfig, BuildNumberConfigSymbol, IBuildNumberConfig } from '../models/config/build-number.config'
import {
  TransactionAvailabilityConfig,
  TransactionAvailabilityConfigSymbol,
  ITransactionAvailabilityConfig,
  OneTimeTokenConfig,
  OneTimeTokenConfigSymbol,
} from '../models/config'
import {
  FeeCalculatorServiceSymbol,
  FeeCalculatorV1Service,
  FeeCalculatorV2Service,
  IFeeCalculatorService,
} from '../services/fee-calculator.service'
import {
  EventQueueSymbol,
  EventQueueOptions,
  DefaultQueueOptions,
  EventQueueFactorySymbol,
  eventQueueFactory,
} from '../utils/event-queue'
import { ReferrerRewardQueueV1 } from '../microservice/referral-reward/common'
import { PushQueueV1 } from '../microservice/push/common'
import { IUsernameConfig, UsernameConfig, UsernameConfigSymbol } from '../models/config/username.config'
import { FullNameInput } from '../models/request/full-name.input'
import { UsernameInput } from '../models/request/username.input'
import { DoBInput } from '../models/request/dob.input'
import { IncomingWalletProcessorQueue } from '../microservice/incoming-wallet-processor/model/queue.config'
import {
  ISchedulerBusinessService,
  SchedulerBusinessService,
  SchedulerBusinessServiceSymbol,
} from '../services/business/scheduler.business.service'
import { BitGoConfig, BitGoConfigSymbol, IBitGoConfig } from '../models/config'
import { UserFreshchatInput } from '../models/request/user-freshchat.input'
import { PhoneVerifyInput } from '../models/request/phone-verify.input'
import { ReportQueueName } from '../microservice/reporting/common'

export function setupRootContainer(container: Container): void {
  // configs
  container.bind<IConfig>(ConfigSymbol).toConstantValue(config)
  container.bind<IRedisConfig>(RedisConfigSymbol).to(RedisConfig).inSingletonScope()
  container.bind<ITwilioConfig>(TwilioConfigSymbol).to(TwilioConfig).inSingletonScope()
  container.bind<IVerificationConfig>(VerificationConfigSymbol).to(VerificationConfig).inSingletonScope()
  container.bind<IBranchIOConfig>(BranchIOConfigSymbol).to(BranchIOConfig).inSingletonScope()
  container.bind<IAirtableConfig>(AirtableConfigSymbol).to(AirtableConfig).inSingletonScope()
  container.bind<IAppConfig>(AppConfigSymbol).to(AppConfig).inSingletonScope()
  container.bind<IMailgunConfig>(MailgunConfigSymbol).to(MailgunConfig).inSingletonScope()
  container.bind<IFreshdeskConfig>(FreshdeskConfigSymbol).to(FreshdeskConfig).inSingletonScope()
  container.bind<IConfigurationApiConfig>(ConfigurationApiConfigSymbol).to(ConfigurationApiConfig).inSingletonScope()
  container.bind<IPaystackConfig>(PaystackConfigSymbol).to(PaystackConfig).inSingletonScope()
  container.bind<IPhoneListConfig>(PhoneListConfigSymbol).to(PhoneListConfig).inSingletonScope()
  container.bind<IFeatureConfig>(FeatureConfigSymbol).to(FeatureConfig).inSingletonScope()
  container.bind<IModernTreasuryConfig>(ModernTreasuryConfigSymbol).to(ModernTreasuryConfig).inSingletonScope()
  container.bind<IOperationsApiConfig>(OperationsApiConfigSymbol).to(OperationsApiConfig).inSingletonScope()
  container.bind<ICacheConfig>(CacheConfigSymbol).to(CacheConfig).inSingletonScope()
  container
    .bind<IBuildNumberConfig>(BuildNumberConfigSymbol)
    .toDynamicValue(context => BuildNumberConfig.init())
    .inSingletonScope()
  container
    .bind<ITransactionAvailabilityConfig>(TransactionAvailabilityConfigSymbol)
    .to(TransactionAvailabilityConfig)
    .inSingletonScope()
  container.bind<ISupportConfig>(SupportConfigSymbol).to(SupportConfig).inSingletonScope()
  container.bind<IDashboardApiConfig>(DashboardApiConfigSymbol).to(DashboardApiConfig).inSingletonScope()
  container.bind<IReferralConfig>(ReferralConfigSymbol).to(ReferralConfig).inSingletonScope()
  container.bind<IUsernameConfig>(UsernameConfigSymbol).to(UsernameConfig).inSingletonScope()
  container.bind<ISumsubConfig>(SumsubConfigSymbol).to(SumsubConfig).inSingletonScope()
  container.bind<IBridgeCardConfig>(BridgeCardConfigSymbol).to(BridgeCardConfig).inSingletonScope()
  container.bind<IBitGoConfig>(BitGoConfigSymbol).to(BitGoConfig).inSingletonScope()
  container.bind<IIdentityConfig>(IdentityConfigSymbol).to(IdentityConfig).inSingletonScope()
  container.bind<IPhoneConfig>(PhoneConfigSymbol).to(PhoneConfig).inSingletonScope()

  container
    .bind<ISchedulerBusinessService>(SchedulerBusinessServiceSymbol)
    .to(SchedulerBusinessService)
    .inSingletonScope()

  // token configs
  container.bind<ITokenConfig>(AuthTokenConfigSymbol).to(AuthTokenConfig).inSingletonScope()
  container.bind<ITokenConfig>(ConfirmTokenConfigSymbol).to(ConfirmTokenConfig).inSingletonScope()
  container.bind<ITokenConfig>(PinTokenConfigSymbol).to(PinTokenConfig).inSingletonScope()
  container.bind<ITokenConfig>(OneTimeTokenConfigSymbol).to(OneTimeTokenConfig).inSingletonScope()

  // logger
  setupLogger(container)
  setupExtendedLogger(container)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)

  // middlewares
  container.bind<ErrorHandlerMiddleware>(ErrorHandlerMiddlewareSymbol).to(ErrorHandlerMiddleware).inSingletonScope()

  // db
  const sqlConfig = config.get<pg.PoolConfig>('dbConfig')
  const pool = new pg.Pool(sqlConfig)

  container.bind<IQueryDriver<ISqlQuery>>(OrmSymbols.SqlQueryDriver).toDynamicValue(({ container }) => {
    // const profilingSession = container.get<IProfilingSession>(ProfilingSessionSymbol)
    // return new ProfilingPgDriver(profilingSession, 'db', pool as never)
    return new PgDriver(pool as any)
  })
  container.bind<IBuildableQueryCompiler<ISqlQuery>>(OrmSymbols.SqlQueryBuilder).to(PgCompiler)

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
  bindQueues(container)

  // singleton services
  container.bind<IAirtableService>(AirtableServiceSymbol).to(AirtableService).inSingletonScope()
  container
    .bind<ICalculatorService>(CalculatorServiceSymbol)
    .to(CalculatorService)
    .inSingletonScope()
    .whenTargetNamed('calculatorV1')
  container
    .bind<ICalculatorService>(CalculatorServiceSymbol)
    .to(CalculatorV2Service)
    .inSingletonScope()
    .whenTargetNamed('calculatorV2')
  container
    .bind<IFeeCalculatorService>(FeeCalculatorServiceSymbol)
    .to(FeeCalculatorV1Service)
    .inSingletonScope()
    .whenTargetNamed('feesV1')
  container
    .bind<IFeeCalculatorService>(FeeCalculatorServiceSymbol)
    .to(FeeCalculatorV2Service)
    .inSingletonScope()
    .whenTargetNamed('feesV2')
  container.bind<IDateFormatterService>(DateFormatterServiceSymbol).to(DateFormatterService).inSingletonScope()

  bindValidation(
    container,
    //
    SignInInput,
    EmailVerifyInput,
    EmailInput,
    SignUpInput,
    InviteInput,
    UserDefaultCurrencyInput,
    PushSubscribeInput,
    PushUnsubscribeInput,
    SupportInput,
    ReferrerVerifyInput,
    UpdateReferralCodeInput,
    DoBInput,
    SignUpV2Input,
    AddressInput,
    UsernameInput,
    FullNameInput,
    UserFreshchatInput,
    WaitlistFeatureInput,
    UserWaitlistInput,
    PhoneVerifyInput,
  )

  bindSanitizers(container)
}

function bindValidation(container: Container, ...InputModels: Function[]) {
  container
    .bind<IValidator<string>>(ValidatorSymbol)
    .toConstantValue(new SingleValidator([presence(), uuid()]))
    .whenTargetNamed('uuid')

  container.bind<IValidator<string>>(ValidatorSymbol).to(PhoneValidator).whenTargetNamed('phone')

  for (const InputModel of InputModels) {
    container
      .bind<IValidator<unknown>>(validation.symbolFor(InputModel))
      .toConstantValue(new ModelValidator(InputModel as never))
  }
}

function bindSanitizers(container: Container) {
  container
    .bind<Sanitizer>(RestSymbols.Sanitizer)
    .toConstantValue(({ password, ...user }) => user)
    .whenTargetNamed('password')

  container
    .bind<Sanitizer>(RestSymbols.Sanitizer)
    .toConstantValue(({ id, ...rest }) => rest)
    .whenTargetNamed('id')
}

function bindQueues(container: Container) {
  container.bind(EventQueueFactorySymbol).toFactory(eventQueueFactory)

  container
    .bind<Queue>(EventQueueSymbol)
    .toDynamicValue(() => {
      const redisConfig = container.get<IRedisConfig>(RedisConfigSymbol)
      const queueName = ReferrerRewardQueueV1
      const queueOptions = EventQueueOptions[queueName] ?? DefaultQueueOptions

      return new Queue(queueName, { ...queueOptions, connection: redisConfig })
    })
    .inSingletonScope()
    .whenTargetNamed(ReferrerRewardQueueV1)

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
    .bind<Queue>(EventQueueSymbol)
    .toDynamicValue(() => {
      const redisConfig = container.get<IRedisConfig>(RedisConfigSymbol)
      const queueName = ReportQueueName
      const queueOptions = EventQueueOptions[queueName] ?? DefaultQueueOptions

      return new Queue(queueName, { ...queueOptions, connection: redisConfig })
    })
    .inSingletonScope()
    .whenTargetNamed(ReportQueueName)
}

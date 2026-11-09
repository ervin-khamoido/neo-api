2021

import { Container, interfaces } from 'inversify'
import * as pg from 'pg'
import config, { IConfig } from 'config'

import { ISqlQuery, PgCompiler, PgDriver } from '@ts-awesome/orm-pg'
import { ConfigSymbol, ILoggerFactory, LoggerFactorySymbol, setup as setupLogger } from '@ts-awesome/logger'
import { IBuildableQueryCompiler, IQueryDriver, Symbols as OrmSymbols, TableMetaProvider } from '@ts-awesome/orm'
import { EntityService, IEntityService, IQueryExecutorProvider, IUnitOfWork, UnitOfWork } from '@ts-awesome/entity'
import { Symbols as EntitySymbols } from '@ts-awesome/entity/dist/symbols'

import { IRedisConfig, RedisConfig, RedisConfigSymbol } from '../lib/models/config'
import { UserDetailsEntityService, UserDetailsModel, UserModel } from '../models/db'
import { UserPushModel } from '../models/db'

import { IPushService, PushService, PushServiceSymbol } from '../services/push.service'
import { WorkerFactory, WorkerFactorySymbol } from '../microservice/common/worker.factory'
import { Worker } from 'bullmq'
import {
  IKeyValueStorageService,
  KeyValueStorageProvider,
  KeyValueStorageServiceSymbol,
  LocalStorageService,
  RedisService,
} from '../lib/services/key-value-storage'
import Redis from 'ioredis'
import { CacheConfig, CacheConfigSymbol, ICacheConfig } from '../models/config'

export function setupPushContainer(container: Container): void {
  // configs
  container.bind<IConfig>(ConfigSymbol).toConstantValue(config)
  container.bind<IRedisConfig>(RedisConfigSymbol).to(RedisConfig).inSingletonScope()
  container.bind<ICacheConfig>(CacheConfigSymbol).to(CacheConfig).inSingletonScope()

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
    UserPushModel,
  )
  bindCustomEntityService(container, UserDetailsModel, UserDetailsEntityService)

  // services
  container.bind<IPushService>(PushServiceSymbol).to(PushService)
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

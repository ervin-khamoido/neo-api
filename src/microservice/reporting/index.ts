import { Container } from 'inversify'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'
import { LoggerFactorySymbol } from '@ts-awesome/logger'
import fbAdmin from 'firebase-admin'

import cacheUtil from '../../utils/cache-util'
import { CacheConfigSymbol, ICacheConfig } from '../../models/config'

import { IKeyValueStorageService, KeyValueStorageServiceSymbol } from '../../lib/services/key-value-storage'

import { IReportingService, ReportingService } from './reporting.service'
import { setupReportingProcessor } from './ioc/reporting.scope'

// setup container
const container = new Container()
setupReportingProcessor(container)

// setup logger
const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
export const logger = loggerFactory('Reporting Global')

// initialize cache
const keyValueStorage = container.get<IKeyValueStorageService>(KeyValueStorageServiceSymbol)
const cacheConfig = container.get<ICacheConfig>(CacheConfigSymbol)
cacheUtil.initialize(cacheConfig, keyValueStorage, loggerFactory)

// create reporting service
export const reportingService = container.resolve<IReportingService>(ReportingService)

async function startup() {
  // initialize Firebase Admin
  const serviceAccount = JSON.parse(process.env.FIREBASE as any)
  fbAdmin.initializeApp({
    credential: fbAdmin.credential.cert(serviceAccount),
  })

  try {
    await reportingService.start()
  } catch (err: any) {
    logger.error(err)
    process.exit(1)
  }
}

if (process.env.NODE_ENV !== 'production') {
  startup()
}

export default startup

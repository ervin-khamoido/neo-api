import { Container } from 'inversify'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'
import { LoggerFactorySymbol } from '@ts-awesome/logger'
import fbAdmin from 'firebase-admin'

import ioc from '../../ioc'
import { IReferralRewardService, ReferralRewardService } from './referral-reward.service'
import { IPushService, PushService } from '../push/push.service'
import { IKeyValueStorageService, KeyValueStorageServiceSymbol } from '../../lib/services/key-value-storage'
import { CacheConfigSymbol, ICacheConfig } from '../../models/config'
import cacheUtil from '../../utils/cache-util'

// global scope
const container = new Container()
ioc.setupReferralRewardContainer(container)

const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
export const logger = loggerFactory('Referral Reward Global')
export const pushService = container.resolve<IPushService>(PushService)

const keyValueStorage = container.get<IKeyValueStorageService>(KeyValueStorageServiceSymbol)
const cacheConfig = container.get<ICacheConfig>(CacheConfigSymbol)

cacheUtil.initialize(cacheConfig, keyValueStorage, loggerFactory)

export const referralRewardService = container.resolve<IReferralRewardService>(ReferralRewardService)

async function startup() {
  const serviceAccount = JSON.parse(process.env.FIREBASE as any)
  fbAdmin.initializeApp({
    credential: fbAdmin.credential.cert(serviceAccount),
  })

  try {
    await referralRewardService.start()
  } catch (err: any) {
    logger.error(err)
    process.exit(1)
  }
}

if (process.env.NODE_ENV !== 'production') {
  startup()
}

export default startup

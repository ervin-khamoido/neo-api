2021

// eslint-disable-next-line filenames/match-exported
import 'reflect-metadata'
import 'source-map-support/register'

import { Container } from 'inversify'

import './middleware'
import './lib/middleware'
import './routes'

import ioc from './ioc'
import { ApplicationServer } from './app-server'
import { IncomingWalletProcessorQueue } from './microservice/incoming-wallet-processor/model/queue.config'

import {
  ISchedulerBusinessService,
  SchedulerBusinessServiceSymbol,
} from './services/business/scheduler.business.service'
import { ReceiveMoneyBusinessService } from './services/business/receive/receive-money.business.service'

const container = new Container()
ioc.setupRootContainer(container)

// Start repeatable jobs
;(async function () {
  const scheduler = container.get<ISchedulerBusinessService>(SchedulerBusinessServiceSymbol)

  try {
    await scheduler.scheduleRepeatableJob(IncomingWalletProcessorQueue, ReceiveMoneyBusinessService.RepeatableJobConfig)
  } catch (ignore) {}
})()

// Start server
// Test Deployment
const SERVER = new ApplicationServer(container)

if (process.env.NODE_ENV !== 'production') {
  SERVER.start()
}

export default SERVER

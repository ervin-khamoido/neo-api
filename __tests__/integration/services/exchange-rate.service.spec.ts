2021

/**
 * @jest-environment node
 */

import { Container } from 'inversify'
import config, { IConfig } from 'config'

import { addHours, addMinutes, subMinutes } from 'date-fns'
import { ConfigSymbol } from '@ts-awesome/logger'

import * as ioc from '../../lib/ioc'

import { ExchangeRateModel } from '../../../src/models/db/exchange-rate.model'
import { ExchangeRateEntityServiceSymbol, IExchangeRateEntityService } from '../../../src/models/db/exchange-rate.model'

import { ExchangeRateService, IExchangeRateService } from '../../../src/services/exchange-rate.service'
import { AirtableExchangeRate } from '../../../src/models/airtable'
import { AirtableServiceSymbol, IAirtableService } from '../../../src/services/airtable.service'

describe('exchange-rate.service', () => {
  const __containerRoot = new Container()

  beforeAll(() => {
    __containerRoot.bind<IConfig>(ConfigSymbol).toConstantValue(config)

    ioc.database.setup(__containerRoot)
    ioc.logger.setup(__containerRoot)
  })

  afterAll(async () => {
    await ioc.database.tearDown()
  })

  let container: Container | null = null

  beforeEach(() => {
    container = __containerRoot.createChild()
    ioc.entityServices.setup(container, ExchangeRateModel)

    // clean up table before test
    const exchangeRateService = container.get<IExchangeRateEntityService>(ExchangeRateEntityServiceSymbol)
    exchangeRateService.delete(x => x.id.gt(0))
  })

  afterEach(() => {
    container = null
  })

  describe('exchange-rate.service > getLatestExchangeRate', () => {
    test('should return -1 when no records in exchange_rates table found', async () => {
      injectAirtableServiceMock(container!, [])
      const exchangeService = container!.resolve<IExchangeRateService>(ExchangeRateService)

      const rate = await exchangeService.getLatestExchangeRate()

      expect(rate).toEqual(-1)
    })

    test('should return -1 when applies at is after now', async () => {
      const now = new Date()
      injectAirtableServiceMock(container!, [
        {
          // future
          id: 'quNehbe28lBmPeK7TwX0rNHS',
          exchange_rate: 100,
          created_datetime: now,
          modified_datetime: now,
          start_datetime: addHours(now, 1),
          buy_exchange_rate: 10,
          sell_exchange_rate: 11,
        },
        {
          // future
          id: 'e9Bmosq8JOvDpVnTMm9jRB01',
          exchange_rate: 100,
          created_datetime: now,
          modified_datetime: now,
          start_datetime: addMinutes(now, 5),
          buy_exchange_rate: 10,
          sell_exchange_rate: 11,
        },
      ])
      const exchangeService = container!.resolve<IExchangeRateService>(ExchangeRateService)

      const rate = await exchangeService.getLatestExchangeRate()

      expect(rate).toEqual(-1)
    })

    test('should return correct exchange rate when applies at of all records is before now', async () => {
      const now = new Date()
      injectAirtableServiceMock(container!, [
        {
          // past
          id: 'quNehbe28lBmPeK7TwX0rNHS',
          exchange_rate: 1,
          created_datetime: subMinutes(now, 10),
          modified_datetime: subMinutes(now, 10),
          start_datetime: subMinutes(now, 10),
          buy_exchange_rate: 10,
          sell_exchange_rate: 11,
        },
        {
          // current
          id: 'e9Bmosq8JOvDpVnTMm9jRB01',
          exchange_rate: 2,
          created_datetime: subMinutes(now, 5),
          modified_datetime: subMinutes(now, 5),
          start_datetime: subMinutes(now, 5),
          buy_exchange_rate: 10,
          sell_exchange_rate: 11,
        },
      ])
      const exchangeService = container!.resolve<IExchangeRateService>(ExchangeRateService)

      const rate = await exchangeService.getLatestExchangeRate()

      expect(rate).toEqual(2)
    })

    test('should return correct exchange rate when applies at of several records is after now', async () => {
      const now = new Date()
      injectAirtableServiceMock(container!, [
        {
          // future
          id: 'quNehbe28lBmPeK7TwX0rNHS',
          exchange_rate: 1,
          created_datetime: addMinutes(now, 10),
          modified_datetime: addMinutes(now, 10),
          start_datetime: addMinutes(now, 10),
          buy_exchange_rate: 10,
          sell_exchange_rate: 11,
        },
        {
          // current
          id: 'e9Bmosq8JOvDpVnTMm9jRB01',
          exchange_rate: 2,
          created_datetime: subMinutes(now, 5),
          modified_datetime: subMinutes(now, 5),
          start_datetime: subMinutes(now, 5),
          buy_exchange_rate: 10,
          sell_exchange_rate: 11,
        },
      ])
      const exchangeService = container!.resolve<IExchangeRateService>(ExchangeRateService)

      const rate = await exchangeService.getLatestExchangeRate()

      expect(rate).toEqual(2)
    })
  })
})

function injectAirtableServiceMock(container: Container, exchangeRates: AirtableExchangeRate[]) {
  const airtableService: IAirtableService = {
    getExchangeRateAfter: () => Promise.resolve(exchangeRates),
    getYieldAprForDate: jest.fn(),
    getYieldApr: jest.fn(),
    addLPBankAccountAvailability: jest.fn(),
    getLPBankAccountAvailabilities: jest.fn(),
    getCashbackForDate: jest.fn(),
  }

  container.bind(AirtableServiceSymbol).toConstantValue(airtableService)
}

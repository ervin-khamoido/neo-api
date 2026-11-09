2021

import { IHttpRequest } from '@ts-awesome/rest'
import { RequestError } from '@ts-awesome/rest/dist/errors'

import { NoopLoggerFactory } from '../../logger.mock'

import { DashboardAccessMiddleware } from '../../../../src/middleware'

describe('DashboardAccessMiddleware', () => {
  let dashboardAccessMiddleware: DashboardAccessMiddleware
  let requestMock: IHttpRequest
  const dashboardApiKey = 'token'

  afterAll(() => {
    jest.clearAllMocks()
  })

  beforeEach(() => {
    dashboardAccessMiddleware = new DashboardAccessMiddleware()
    dashboardAccessMiddleware.loggerFactory = NoopLoggerFactory
    requestMock = {
      headers: {
        'x-dashboard-token': dashboardApiKey,
      },
    } as any
  })

  describe('handle()', () => {
    describe('success', () => {
      test('Should resolve if config.key is valid', async () => {
        dashboardAccessMiddleware.dashboardConfig = { key: dashboardApiKey }

        const responsePromise = dashboardAccessMiddleware.handle(requestMock)
        await expect(responsePromise).resolves.toBeUndefined()
      })
    })

    describe('dashboardApiKey check', () => {
      test('Should throw unauthorized error if the api key is EMPTY', async () => {
        requestMock = { headers: {} } as any

        const responsePromise = dashboardAccessMiddleware.handle(requestMock)
        await expect(responsePromise).rejects.toThrowError(RequestError)
      })

      test('Should throw unauthorized error if the api key is an invalid value', async () => {
        dashboardAccessMiddleware.dashboardConfig = { key: `${dashboardApiKey}_wrong` }

        const responsePromise = dashboardAccessMiddleware.handle(requestMock)
        await expect(responsePromise).rejects.toThrowError(RequestError)
      })
    })
  })
})

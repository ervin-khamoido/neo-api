2021

import { NoopLoggerFactory } from '../../logger.mock'
import {
  IOperationsAccessMiddleware,
  IOperationsAccessOptions,
  OperationsAccessMiddlewareFactory,
} from '../../../../src/middleware/access/operations-access.middleware'
import { IHttpRequest, RequestError } from '@ts-awesome/rest'
import { OperationsAudience } from '../../../../src/models/config'

describe('OperationsAccessMiddlewareFactory', () => {
  const token = 'token'
  let requestMock: IHttpRequest = {
    headers: {
      'x-operations-token': token,
    },
  } as any
  const responseMock = {} as any

  function buildOperationsMiddleware(options: IOperationsAccessOptions): IOperationsAccessMiddleware {
    const operationsAccessMiddleware = <IOperationsAccessMiddleware>new (OperationsAccessMiddlewareFactory(options))()
    operationsAccessMiddleware.loggerFactory = NoopLoggerFactory

    return operationsAccessMiddleware
  }

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('handle()', () => {
    describe('success', () => {
      test('Should resolve if yield processor key is valid', async () => {
        const operationsAccessMiddleware = buildOperationsMiddleware({ audience: OperationsAudience.YieldProcessor })

        operationsAccessMiddleware.config = {
          audienceKeys: [
            {
              audience: OperationsAudience.YieldProcessor,
              key: token,
            },
          ],
        }

        const responsePromise = operationsAccessMiddleware.handle(requestMock, responseMock)
        await expect(responsePromise).resolves.toBeUndefined()
      })

      test('Should resolve if retool key is valid', async () => {
        const operationsAccessMiddleware = buildOperationsMiddleware({ audience: OperationsAudience.Retool })

        operationsAccessMiddleware.config = {
          audienceKeys: [
            {
              audience: OperationsAudience.YieldProcessor,
              key: token,
            },
            {
              audience: OperationsAudience.Retool,
              key: `${token}_retool`,
            },
          ],
        }

        requestMock = {
          headers: {
            'x-operations-token': `${token}_retool`,
          },
        } as any

        const responsePromise = operationsAccessMiddleware.handle(requestMock, responseMock)
        await expect(responsePromise).resolves.toBeUndefined()
      })
    })

    describe('configurationApiKey check', () => {
      test('Should throw unauthorizederror if config api key is EMPTY', async () => {
        const operationsAccessMiddleware = buildOperationsMiddleware({ audience: OperationsAudience.YieldProcessor })

        requestMock = { headers: {} } as any

        const responsePromise = operationsAccessMiddleware.handle(requestMock, responseMock)
        await expect(responsePromise).rejects.toThrowError(RequestError)
      })

      test('Should throw unauthorized error if config api key is invalid value', async () => {
        const operationsAccessMiddleware = buildOperationsMiddleware({ audience: OperationsAudience.YieldProcessor })

        operationsAccessMiddleware.config = {
          audienceKeys: [
            {
              audience: OperationsAudience.YieldProcessor,
              key: `${token}_wrong`,
            },
          ],
        }

        const responsePromise = operationsAccessMiddleware.handle(requestMock, responseMock)
        await expect(responsePromise).rejects.toThrowError(RequestError)
      })

      test('Should throw unauthorized error if nonexistent audience is used', async () => {
        const operationsAccessMiddleware = buildOperationsMiddleware({ audience: OperationsAudience.Retool })

        operationsAccessMiddleware.config = {
          audienceKeys: [
            {
              audience: OperationsAudience.YieldProcessor,
              key: `${token}_wrong`,
            },
          ],
        }

        const responsePromise = operationsAccessMiddleware.handle(requestMock, responseMock)
        await expect(responsePromise).rejects.toThrowError(RequestError)
      })
    })
  })
})

import { IHttpRequest, RequestError } from '@ts-awesome/rest'
import { ConfigurationAccessMiddleware } from '../../../../src/middleware/access/configuration-access.middleware'
import { NoopLoggerFactory } from '../../logger.mock'
import { Mock } from 'moq.ts'

describe('ConfigurationAccessMiddleware', () => {
  let configurationAccessMiddleware: ConfigurationAccessMiddleware

  const requestMockResolver = (value: any) =>
    new Mock<IHttpRequest<any>>()
      .setup(o => o.headers)
      .returns(value)
      .object()

  beforeEach(() => {
    configurationAccessMiddleware = new ConfigurationAccessMiddleware()
    configurationAccessMiddleware.loggerFactory = NoopLoggerFactory
  })

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('handle()', () => {
    test('should throw error if header is absent', async () => {
      let requestMock = requestMockResolver({})
      configurationAccessMiddleware.config = {
        allow: true,
        key: 'testkey',
      }
      let responsePromise = configurationAccessMiddleware.handle(requestMock)
      await expect(responsePromise).rejects.toThrowError(RequestError)
    })

    test('should throw error if config = false', async () => {
      let requestMock = requestMockResolver({ 'x-configuration-token': 'test' })
      configurationAccessMiddleware.config = {
        allow: false,
        key: 'testkey',
      }
      let response = configurationAccessMiddleware.handle(requestMock)
      await expect(response).rejects.toThrowError(RequestError)
    })
    ;['', 'testkey'].forEach(key => {
      test(`should throw error if config.key (${key}) != x-configuration-token in header (test)`, async () => {
        let requestMock = requestMockResolver({ 'x-configuration-token': 'test' })
        configurationAccessMiddleware.config = {
          allow: true,
          key,
        }
        let response = configurationAccessMiddleware.handle(requestMock)
        await expect(response).rejects.toThrowError(RequestError)
      })
    })
  })
})

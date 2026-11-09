import { IConfig } from 'config'
import { NoopLoggerFactory } from '../../logger.mock'
import { WebhookAccessMiddleware } from '../../../../src/middleware/access/webhook-access.middleware'
import { IHttpRequest, RequestError, UnauthorizedError } from '@ts-awesome/rest'
import { It, Mock } from 'moq.ts'

describe('WebhookAccessMiddleware', () => {
  const accessToken = 'testtoken'
  const config: IConfig = new Mock<IConfig>()
    .setup(instance => instance.get(It.IsAny()))
    .returns(accessToken)
    .object()

  const requestMockResolver = (value: any) =>
    new Mock<IHttpRequest<any>>()
      .setup(o => o.headers)
      .returns(value)
      .object()

  let webhookMiddleware: WebhookAccessMiddleware

  afterAll(() => {
    jest.clearAllMocks()
  })

  beforeEach(() => {
    webhookMiddleware = new WebhookAccessMiddleware()
    webhookMiddleware.config = config
    webhookMiddleware.loggerFactory = NoopLoggerFactory
  })

  describe('handle()', () => {
    test('Should not throw error if webhook access token is valid', async () => {
      let requestMock = requestMockResolver({ 'x-webhook-token': accessToken })
      let response = webhookMiddleware.handle(requestMock)
      await expect(response).resolves.toBeUndefined()
    })

    test('Should throw err if access token header is missing', async () => {
      let reqMock = requestMockResolver({})
      let response = webhookMiddleware.handle(reqMock)
      await expect(response).rejects.toThrowError(RequestError)
    })

    test('Should throw err if access token != header x-webhook-token', async () => {
      let reqMock = requestMockResolver({ 'x-webhook-token': `${accessToken}_wrong` })
      let response = webhookMiddleware.handle(reqMock)
      await expect(response).rejects.toThrowError(UnauthorizedError)
    })
  })
})

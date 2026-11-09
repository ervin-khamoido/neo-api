import { ILoggerFactory } from '@ts-awesome/logger'
import { ForbiddenError, IHttpRequest, RequestError } from '@ts-awesome/rest'
import { It, Mock } from 'moq.ts'
import { ITokenService } from '../../../../src/lib/services/token'
import { PinAccessMiddleware } from '../../../../src/middleware/access/pin-access.middleware'
import { UserModel, UserSettingsModel } from '../../../../src/models/db'
import { IPinPayload } from '../../../../src/services/token'
import { IUserSettingsService } from '../../../../src/services/user-settings.service'
import { NoopLoggerFactory } from '../../logger.mock'

describe('PinAccessMiddleware', () => {
  const userSettingsServiceResolver = (userSetting: UserSettingsModel | null) =>
    new Mock<IUserSettingsService>()
      .setup(instance => instance.getUserSettings(It.IsAny()))
      .returnsAsync(userSetting)
      .object()

  const tokenServiceResolver = (payload: any) =>
    new Mock<ITokenService<IPinPayload>>()
      .setup(instance => instance.verify(It.IsAny()))
      .returns(payload)
      .object()

  const requestMockResolver = (headers: any) =>
    new Mock<IHttpRequest<any>>()
      .setup(o => o.headers)
      .returns(headers)
      .object()

  let user: UserModel
  let payload: IPinPayload

  let pinAccessMiddleware: PinAccessMiddleware

  beforeEach(() => {
    pinAccessMiddleware = new PinAccessMiddleware()
    pinAccessMiddleware.loggerFactory = NoopLoggerFactory
    pinAccessMiddleware.user = { id: 0 } as UserModel
  })

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('handle()', () => {
    describe('Should throw error when', () => {
      test('userSettings is undefined', async () => {
        let requestMock = requestMockResolver({ 'x-pin-token': 'token' })
        pinAccessMiddleware.userSettingsService = userSettingsServiceResolver(null)

        let responsePromise = pinAccessMiddleware.handle(requestMock)
        await expect(responsePromise).rejects.toThrowError(ForbiddenError)
      })

      test('tokenservice.verify throws error', async () => {
        let userSettingsModel: UserSettingsModel = {
          enableAppLock: true,
        } as UserSettingsModel
        let requestMock: IHttpRequest<any> = requestMockResolver({ 'x-pin-token': 'token' })
        pinAccessMiddleware.userSettingsService = userSettingsServiceResolver(userSettingsModel)
        pinAccessMiddleware.tokenService = new Mock<ITokenService<IPinPayload>>()
          .setup(instance => instance.verify(It.IsAny()))
          .throwsAsync(new Error())
          .object()

        let responsePromise = pinAccessMiddleware.handle(requestMock)
        await expect(responsePromise).rejects.toThrowError(RequestError)
      })

      test('payload.user != user.id', async () => {
        user = {
          id: 0,
          uid: '',
        } as UserModel

        payload = {
          user: 'a0022af5-9d48-4ff0-8f2b-41cce19c3b92',
          aud: ['pin'],
        }

        pinAccessMiddleware.user = user
        pinAccessMiddleware.tokenService = tokenServiceResolver(payload)

        let userSettingsModel: UserSettingsModel = {
          enableAppLock: true,
        } as UserSettingsModel
        let requestMock: IHttpRequest<any> = requestMockResolver({ 'x-pin-token': 'token' })
        pinAccessMiddleware.userSettingsService = userSettingsServiceResolver(userSettingsModel)

        let responsePromise = pinAccessMiddleware.handle(requestMock)
        await expect(responsePromise).rejects.toThrowError(RequestError)
      })
      ;['', [''], `${PinAccessMiddleware.AUDIENCE}_wrong`].forEach(aud => {
        test('payload AUD is incorrect', async () => {
          user = {
            id: 0,
            uid: 'a0022af5-9d48-4ff0-8f2b-41cce19c3b92',
          } as UserModel

          payload = {
            user: 'a0022af5-9d48-4ff0-8f2b-41cce19c3b92',
            aud,
          }
          pinAccessMiddleware.user = user
          pinAccessMiddleware.tokenService = tokenServiceResolver(payload)

          let userSettingsModel: UserSettingsModel = {
            enableAppLock: true,
          } as UserSettingsModel
          let requestMock: IHttpRequest<any> = requestMockResolver({ 'x-pin-token': 'token' })
          pinAccessMiddleware.userSettingsService = userSettingsServiceResolver(userSettingsModel)

          let responsePromise = pinAccessMiddleware.handle(requestMock)
          await expect(responsePromise).rejects.toThrowError(RequestError)
        })
      })

      describe('when header', () => {
        let userSettingsModel: UserSettingsModel

        beforeEach(() => {
          userSettingsModel = {
            enableAppLock: true,
          } as UserSettingsModel
        })

        test('is undefined', async () => {
          pinAccessMiddleware.userSettingsService = userSettingsServiceResolver(userSettingsModel)
          let requestMock = requestMockResolver({})
          let responsePromise = pinAccessMiddleware.handle(requestMock)
          await expect(responsePromise).rejects.toThrowError(RequestError)
        })

        test('is an array', async () => {
          pinAccessMiddleware.userSettingsService = userSettingsServiceResolver(userSettingsModel)
          let requestMock = requestMockResolver({ 'x-pin-token': ['token'] })
          let responsePromise = pinAccessMiddleware.handle(requestMock)
          await expect(responsePromise).rejects.toThrowError(RequestError)
        })
      })
    })

    describe('Should resove when', () => {
      ;[PinAccessMiddleware.AUDIENCE, [PinAccessMiddleware.AUDIENCE]].forEach(aud => {
        test('payload and access token in header is formed correctly', async () => {
          let userSettingsModel: UserSettingsModel = {
            enableAppLock: true,
          } as UserSettingsModel
          pinAccessMiddleware.userSettingsService = userSettingsServiceResolver(userSettingsModel)
          let requestMock: IHttpRequest<any> = requestMockResolver({ 'x-pin-token': 'token' })
          user = {
            id: 0,
            uid: 'a0022af5-9d48-4ff0-8f2b-41cce19c3b92',
          } as UserModel

          payload = {
            user: 'a0022af5-9d48-4ff0-8f2b-41cce19c3b92',
            aud,
          }
          pinAccessMiddleware.user = user
          pinAccessMiddleware.tokenService = tokenServiceResolver(payload)

          let response = pinAccessMiddleware.handle(requestMock)
          await expect(response).resolves.toBeUndefined()
        })
      })

      test('applock is disabled', async () => {
        let requestMock = requestMockResolver({ 'x-pin-token': 'token' })
        let model = {
          enableAppLock: false,
        } as UserSettingsModel
        pinAccessMiddleware.userSettingsService = userSettingsServiceResolver(model)
        let response = pinAccessMiddleware.handle(requestMock)
        await expect(response).resolves.toBeUndefined()
      })
    })
  })
})

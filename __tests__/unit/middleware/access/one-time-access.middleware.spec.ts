import { IHttpRequest } from '@ts-awesome/rest'
import { IConfig } from 'config'
import { It, Mock } from 'moq.ts'
import { ITokenService } from '../../../../src/lib/services/token'
import {
  AUDIENCE_ONE_TIME,
  IOneTimeAccessMiddleware,
  OneTimeAccessMiddleware,
  OneTimeAccessOptions,
} from '../../../../src/middleware/access'
import { CurrencyType, IUserSettingsEntityService, UserModel, UserSettingsModel } from '../../../../src/models/db'
import { OneTimeAction } from '../../../../src/services/pin-code.service'
import { IOneTimePayload } from '../../../../src/services/token'

describe('OneTimeAccessMiddleware', () => {
  function setMiddlewareProps(
    middleware: IOneTimeAccessMiddleware,
    config: IConfig,
    user: UserModel,
    userSettingsService: IUserSettingsEntityService,
    tokenService: ITokenService<IOneTimePayload>,
  ) {
    middleware.config = config
    middleware.user = user
    middleware.userSettingsService = userSettingsService
    middleware.tokenService = tokenService
  }

  const userSettingsServiceResolver = (userSetting: UserSettingsModel | null) =>
    new Mock<IUserSettingsEntityService>()
      .setup(instance => instance.getOne(It.IsAny()))
      .returnsAsync(userSetting)
      .object()

  const tokenServiceResolver = (payload: any) =>
    new Mock<ITokenService<IOneTimePayload>>()
      .setup(instance => instance.verify(It.IsAny()))
      .returns(payload)
      .object()

  const requestResolver = (headers: any) =>
    new Mock<IHttpRequest<any>>()
      .setup(o => o.headers)
      .returns(headers)
      .object()
  const responseMock = {} as any

  let config: IConfig
  let user: UserModel
  let options: OneTimeAccessOptions
  let userSettings: UserSettingsModel

  beforeEach(() => {
    config = new Mock<IConfig>()
      .setup(instance => instance.get('domain'))
      .returns('domain')
      .object()

    user = {
      id: 0,
      uid: '',
      phone: '',
      email: '',
      fireUserId: '',
      tokenNbf: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    options = {
      action: OneTimeAction.ChangePin,
    }

    userSettings = {
      userId: 0,
      darkMode: false,
      defaultCurrency: CurrencyType.USD,
      enableAppLock: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('handle()', () => {
    describe('non success', () => {
      ;[{ 'x-one-time-token': '' }, { 'x-one-time-token2': '' }, { 'x-one-time-token': 'sometoken' }, {}].forEach(
        headers => {
          test(`should throw unauthorized when token value is ${JSON.stringify(headers)}`, async () => {
            // enable lock set to true, so one time access checked
            let userSettingsService = userSettingsServiceResolver(userSettings)
            let tokenService = tokenServiceResolver({})

            let middleware: IOneTimeAccessMiddleware = <IOneTimeAccessMiddleware>(
              new (OneTimeAccessMiddleware(options))()
            )

            let requestMock = requestResolver(headers)
            setMiddlewareProps(middleware, config, user, userSettingsService, tokenService)

            const handle = middleware.handle(requestMock, responseMock)
            await expect(handle).rejects.toThrowError('Unauthorized Error')
          })
        },
      )

      test(`should throw unauthorized when token value is verify is unsuccessful}`, async () => {
        // enable lock set to true, so one time access checked
        let userSettingsService = userSettingsServiceResolver(userSettings)
        let tokenService = new Mock<ITokenService<IOneTimePayload>>()
          .setup(instance => instance.verify(It.IsAny()))
          .throws(new Error())
          .object()

        let middleware: IOneTimeAccessMiddleware = <IOneTimeAccessMiddleware>new (OneTimeAccessMiddleware(options))()

        let requestMock = requestResolver({ 'x-one-time-token': 'test' })
        setMiddlewareProps(middleware, config, user, userSettingsService, tokenService)

        const handle = middleware.handle(requestMock, responseMock)
        await expect(handle).rejects.toThrowError('Unauthorized Error')
      })
      ;[<any>undefined, OneTimeAction.ChangePin + '_wrong'].forEach(action => {
        test(`should throw unauthorized when action is ${action}`, async () => {
          let middleware: IOneTimeAccessMiddleware = <IOneTimeAccessMiddleware>new (OneTimeAccessMiddleware(options))()
          let requestMock = requestResolver({ 'x-one-time-token': 'token' })
          let userSettingsService = userSettingsServiceResolver(userSettings)
          let tokenService = tokenServiceResolver({ aud: ['domain', AUDIENCE_ONE_TIME], action: action })

          setMiddlewareProps(middleware, config, user, userSettingsService, tokenService)

          const handle = middleware.handle(requestMock, responseMock)
          await expect(handle).rejects.toThrowError('Unauthorized Error')
        })
      })
      ;[
        <any>undefined,
        'test',
        ['wrong-domain'],
        ['wrong-domain', AUDIENCE_ONE_TIME],
        ['domain', AUDIENCE_ONE_TIME + '_wrong'],
      ].forEach(aud => {
        test(`should throw unauthorized when aud is ${aud}`, async () => {
          let middleware: IOneTimeAccessMiddleware = <IOneTimeAccessMiddleware>new (OneTimeAccessMiddleware(options))()
          let requestMock = requestResolver({ 'x-one-time-token': 'token' })
          let userSettingsService = userSettingsServiceResolver(userSettings)
          let tokenService = tokenServiceResolver({ aud: aud, action: OneTimeAction.ChangePin })
          setMiddlewareProps(middleware, config, user, userSettingsService, tokenService)

          const handle = middleware.handle(requestMock, responseMock)
          await expect(handle).rejects.toThrowError('Unauthorized Error')
        })
      })
    })

    describe('success', () => {
      test('should resolve successfully when enableAppLock = false', async () => {
        userSettings.enableAppLock = false
        let userSettingsService = userSettingsServiceResolver(userSettings)
        let tokenService = tokenServiceResolver({})
        let middleware: IOneTimeAccessMiddleware = <IOneTimeAccessMiddleware>new (OneTimeAccessMiddleware(options))()

        setMiddlewareProps(middleware, config, user, userSettingsService, tokenService)

        let requestMock = requestResolver({ 'x-one-time-token': 'token' })
        const response = middleware.handle(requestMock, responseMock)
        await expect(response).resolves.toBeUndefined()
      })

      test('should resolve successfully when enableAppLock = true and request is valid', async () => {
        let requestMock = requestResolver({ 'x-one-time-token': 'token' })
        let tokenService = tokenServiceResolver({
          aud: ['domain', 'another-domain', AUDIENCE_ONE_TIME],
          action: OneTimeAction.ChangePin,
        })
        let userSettingsService = userSettingsServiceResolver(userSettings)
        let middleware: IOneTimeAccessMiddleware = <IOneTimeAccessMiddleware>new (OneTimeAccessMiddleware(options))()

        setMiddlewareProps(middleware, config, user, userSettingsService, tokenService)

        const handle = middleware.handle(requestMock, responseMock)
        await expect(handle).resolves.toBeUndefined()
      })
    })
  })
})

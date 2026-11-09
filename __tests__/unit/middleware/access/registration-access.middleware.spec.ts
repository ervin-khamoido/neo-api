import { IConfig } from 'config'
import { UserRecord } from 'firebase-admin/lib/auth/user-record'
import { RegistrationAccessMiddleware } from '../../../../src/middleware/access/registration-access.middleware'
import { NoopLoggerFactory } from '../../logger.mock'
import fbAdmin from 'firebase-admin'
import { UnauthorizedError } from '@ts-awesome/rest'
import { It, Mock } from 'moq.ts'

describe('RegistrationAccessMiddleware', () => {
  let registrationAccessMiddleware: RegistrationAccessMiddleware
  const requestMock = {
    headers: { 'X-Configuration-Token': '' },
  } as any

  let fireUser: UserRecord = {
    phoneNumber: '+447123456789',
  } as UserRecord
  const getUser = jest.fn(() => {
    return fireUser
  })

  const configResolver = (value: string) =>
    new Mock<IConfig>()
      .setup(instance => instance.get(It.IsAny()))
      .returns(value)
      .object()

  beforeEach(() => {
    registrationAccessMiddleware = new RegistrationAccessMiddleware()
    registrationAccessMiddleware.loggerFactory = NoopLoggerFactory
    registrationAccessMiddleware.config = configResolver('test')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('handle()', () => {
    describe('Should throw error when', () => {
      test('payload.fireUserUid is not string', async () => {
        registrationAccessMiddleware.claims = {
          aud: ['test', RegistrationAccessMiddleware.AUDIENCE],
          fireUserUid: 1234,
          phone: '+447123456789',
        }
        let responsePromise = registrationAccessMiddleware.handle(requestMock)
        await expect(responsePromise).rejects.toThrowError(UnauthorizedError)
      })

      test('wrong registration audience in payload', async () => {
        registrationAccessMiddleware.claims = {
          aud: ['test', `${RegistrationAccessMiddleware.AUDIENCE}_wrong`],
          fireUserUid: '14bd682e-0738-11ed-b939-0242ac120002',
          phone: '+447123456789',
        }
        let responsePromise = registrationAccessMiddleware.handle(requestMock)
        await expect(responsePromise).rejects.toThrowError(UnauthorizedError)
      })

      test('invalid payload aud: wrong domain', async () => {
        registrationAccessMiddleware.claims = {
          aud: ['test', RegistrationAccessMiddleware.AUDIENCE],
          fireUserUid: '14bd682e-0738-11ed-b939-0242ac120002',
          phone: '+447123456789',
        }
        registrationAccessMiddleware.config = configResolver('development')

        let responsePromise = registrationAccessMiddleware.handle(requestMock)
        await expect(responsePromise).rejects.toThrowError(UnauthorizedError)
      })

      test('fbadmin throws error', async () => {
        registrationAccessMiddleware.claims = {
          aud: ['test', RegistrationAccessMiddleware.AUDIENCE],
          fireUserUid: '14bd682e-0738-11ed-b939-0242ac120002',
          phone: '+447123456789',
        }
        const getUserError = jest.fn(() => {
          throw new Error()
        })
        jest.spyOn(fbAdmin, 'auth').mockReturnValueOnce({ getUserError } as any)
        let responsePromise = registrationAccessMiddleware.handle(requestMock)
        await expect(responsePromise).rejects.toThrowError(UnauthorizedError)
      })

      test('firebase user phone number is mismatched', async () => {
        registrationAccessMiddleware.claims = {
          aud: ['test', RegistrationAccessMiddleware.AUDIENCE],
          fireUserUid: '14bd682e-0738-11ed-b939-0242ac120002',
          phone: '',
        }
        jest.spyOn(fbAdmin, 'auth').mockReturnValueOnce({ getUser } as any)
        let responsePromise = registrationAccessMiddleware.handle(requestMock)
        await expect(responsePromise).rejects.toThrowError(UnauthorizedError)
      })
    })
    describe('Should successfully validate when', () => {
      test('all params are valid', async () => {
        registrationAccessMiddleware.claims = {
          aud: ['test', RegistrationAccessMiddleware.AUDIENCE],
          fireUserUid: '14bd682e-0738-11ed-b939-0242ac120002',
          phone: '+447123456789',
        }

        jest.spyOn(fbAdmin, 'auth').mockReturnValueOnce({ getUser } as any)

        let response = registrationAccessMiddleware.handle(requestMock)
        await expect(response).resolves.toBeUndefined()
      })
    })
  })
})

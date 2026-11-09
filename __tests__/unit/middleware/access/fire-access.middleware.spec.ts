2021

import {
  FireAccessMiddleware,
  FireAccessOptions,
  IFireAccessMiddleware,
} from '../../../../src/middleware/access/fire-access.middleware'
import {
  IUserDetailsEntityService,
  IUserEntityService,
  UserDetailsModel,
  UserModel,
  UserStatus,
} from '../../../../src/models/db'
import { IClaims } from '../../../../src/models/auth'
import { It, Mock } from 'moq.ts'
import { IHttpRequest } from '@ts-awesome/rest'
import { Container } from 'inversify'
import fbAdmin from 'firebase-admin'
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier'
import { UnauthorizedError } from '../../../../src/errors'

describe('FireAccessMiddleware', () => {
  function setMiddleWareProps(
    middleware: IFireAccessMiddleware,
    claims: IClaims,
    token: string,
    userEntityService: IUserEntityService,
    userDetailsEntityService: IUserDetailsEntityService,
  ) {
    middleware.claims = claims
    middleware.token = token
    middleware.userDetailsEntityService = userDetailsEntityService
    middleware.userEntityService = userEntityService
  }
  const verifyIdToken = jest.fn(() => {
    return {} as DecodedIdToken
  })

  const containerMock = new Mock<Container>()
    .setup(c => c.rebind(It.IsAny()))
    .returns(<any>{
      toConstantValue: (_: any) => undefined,
    })
  const container = containerMock.object()

  const requestMock = new Mock<IHttpRequest<any>>()
    .setup(o => o.headers)
    .returns({ 'X-Configuration-Token': '' })
    .setup(o => <Container>o.container)
    .returns(container)
    .object()

  const responseMock = {} as any
  const token = ''

  let claims: IClaims
  let userEntity: UserModel
  let userDetails: UserDetailsModel
  let userEntityService: IUserEntityService
  let userDetailsEntityService: IUserDetailsEntityService

  let options: FireAccessOptions = {
    checkRevoked: true,
    skipApproved: true,
    skipUserExists: true,
  }
  let middleware: IFireAccessMiddleware

  beforeEach(() => {
    middleware = <IFireAccessMiddleware>new (FireAccessMiddleware(options))()
    jest.spyOn(fbAdmin, 'auth').mockReturnValueOnce({ verifyIdToken } as any)
  })

  const userEntityServiceResolver = (user: UserModel | null) =>
    new Mock<IUserEntityService>()
      .setup(instance => instance.getOne(It.IsAny()))
      .returnsAsync(user)
      .object()

  const userDetailsEntityServiceResolver = (userDetail: UserDetailsModel) =>
    new Mock<IUserDetailsEntityService>()
      .setup(instance => instance.getOne(It.IsAny()))
      .returnsAsync(userDetail)
      .object()

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('handle()', () => {
    //Fire access options checkRevoked set to true, but claims is not properly formed
    describe('claims check', () => {
      test('Should throw error if claims is not defined', async () => {
        setMiddleWareProps(
          middleware,
          claims,
          token,
          userEntityService as IUserEntityService,
          userDetailsEntityService as IUserDetailsEntityService,
        )
        const responsePromise = middleware.handle(requestMock, responseMock)
        await expect(responsePromise).rejects.toThrowError(UnauthorizedError)
      })
      ;[123, ['123']].forEach(fireUserUid => {
        test(`Should throw error if claims.fireUserid: (${fireUserUid}) is not a string`, async () => {
          claims = {
            fireUserUid,
          }

          setMiddleWareProps(
            middleware,
            claims,
            token,
            userEntityService as IUserEntityService,
            userDetailsEntityService as IUserDetailsEntityService,
          )

          const resultPromise = middleware.handle(requestMock, responseMock)
          await expect(resultPromise).rejects.toThrowError(UnauthorizedError)
        })
      })
    })

    //User related tests. CheckUserExists(), checkNotDeleted, checkApproved
    describe('User checks', () => {
      beforeEach(() => {
        claims = {
          fireUserUid: '1234-1234',
        }
      })

      test('Should throw error if user does not exist', async () => {
        options = {
          checkRevoked: true,
          skipApproved: true,
          skipUserExists: undefined,
        }
        middleware = <IFireAccessMiddleware>new (FireAccessMiddleware(options))()

        userEntityService = userEntityServiceResolver(null)
        setMiddleWareProps(middleware, claims, token, userEntityService, userDetailsEntityService)

        const responsePromise = middleware.handle(requestMock, responseMock)
        await expect(responsePromise).rejects.toThrowError(UnauthorizedError)
      })
      ;[UserStatus.DeletePending, UserStatus.DeleteRetention].forEach(status => {
        test(`Should throw error when user status is ${status}`, async () => {
          userDetails = { status } as UserDetailsModel
          userEntity = { id: 1234 } as UserModel
          userEntityService = userEntityServiceResolver(userEntity)
          userDetailsEntityService = userDetailsEntityServiceResolver(userDetails)
          setMiddleWareProps(middleware, claims, token, userEntityService, userDetailsEntityService)

          const responsePromise = middleware.handle(requestMock, responseMock)
          await expect(responsePromise).rejects.toThrowError(UnauthorizedError)
        })
      })

      test('Should throw error if user is blocked', async () => {
        const status = UserStatus.Blocked
        userDetails = { status } as UserDetailsModel
        userEntity = { id: 1234 } as UserModel

        userEntityService = userEntityServiceResolver(userEntity)
        userDetailsEntityService = userDetailsEntityServiceResolver(userDetails)
        setMiddleWareProps(middleware, claims, token, userEntityService, userDetailsEntityService)

        const responsePromise = middleware.handle(requestMock, responseMock)
        await expect(responsePromise).rejects.toThrowError(UnauthorizedError)
      })
    })
    describe('success', () => {
      test('Should NOT throw error', async () => {
        userDetails = { status: UserStatus.Active, isApproved: false } as UserDetailsModel
        userEntity = { id: 1234 } as UserModel

        userEntityService = userEntityServiceResolver(userEntity)
        userDetailsEntityService = userDetailsEntityServiceResolver(userDetails)
        setMiddleWareProps(middleware, claims, token, userEntityService, userDetailsEntityService)

        const responsePromise = middleware.handle(requestMock, responseMock)
        await expect(responsePromise).resolves.toBeUndefined()
      })
    })
  })
})

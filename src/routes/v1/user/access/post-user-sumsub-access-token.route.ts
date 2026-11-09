// 2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, NotFoundError, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { ILogger, LoggerFactorySymbol, ILoggerFactory } from '@ts-awesome/logger'
import { of } from '@ts-awesome/orm'

import {
  IKYCLevelEntityService,
  IUserLevelEntityService,
  KYCLevelEntityServiceSymbol,
  KYCLevelModel,
  KYCProviderLevelName,
  UserLevelEntityServiceSymbol,
  UserLevelModel,
  UserModel,
} from '../../../../models/db'
import { AccessTokenOutput } from '../../../../models/response'

import { CurrentUserSymbol } from '../../../../middleware'
import { FireAccessMiddleware } from '../../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../../middleware/access/pin-access.middleware'

import { ISumsubService, SumsubServiceSymbol } from '../../../../services/sumsub.service'
import { IUserLevelService, UserLevelServiceSymbol } from '../../../../services/level/user-level.service'

@httpPost('/api/v1/user/access/sumsub/token', FireAccessMiddleware(), PinAccessMiddleware)
export class PostUserSumsubAccessTokenRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(UserLevelEntityServiceSymbol) userLevelEntityService!: IUserLevelEntityService
  @inject(KYCLevelEntityServiceSymbol) kycLevelEntityService!: IKYCLevelEntityService

  @inject(SumsubServiceSymbol) sumsubService!: ISumsubService
  @inject(UserLevelServiceSymbol) userLevelService!: IUserLevelService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostUserSumsubAccessTokenRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/user/access/sumsub/token',
    description: 'Post create a user access token for Sumsub',
    summary: 'POST create a user access token for Sumsub',
    security: [{ FireToken: [], PinToken: [] }],
    request: {},
    responses: {
      [StatusCode.Success]: { description: 'Sumsub access token', content: AccessTokenOutput },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(): Promise<void> {
    const levelName = await this.getKYCProviderLevelName(this.user.id)
    const accessToken = await this.sumsubService.createAccessToken({ userId: this.user.uid, levelName: levelName })

    return this.json(accessToken, AccessTokenOutput)
  }

  private async getKYCProviderLevelName(userId: number): Promise<KYCProviderLevelName> {
    const { current, next } = await this.userLevelService.getUserLevel(userId)

    const levelCode = next ? next.code : current.code
    const kycLevel = await this.kycLevelEntityService
      .select()
      .join(UserLevelModel, (root, other) => root.id.eq(other.kycLevelId))
      .where(x => of(UserLevelModel, 'code').eq(levelCode))
      .fetchOne(KYCLevelModel)

    if (!kycLevel) {
      throw new NotFoundError(`KYC level not found for user level [${levelCode}]`)
    }

    if (!kycLevel.providerLevelName) {
      throw new BadRequestError(
        `KYC level for user level [${levelCode}] does not have an associated external KYC provider level to complete`,
      )
    }

    return kycLevel.providerLevelName
  }
}

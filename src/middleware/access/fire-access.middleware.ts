2021

import { inject, injectable, interfaces } from 'inversify'
import fbAdmin from 'firebase-admin'

import { IHttpRequest, IMiddleware } from '@ts-awesome/rest'
import { ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { ClaimsSymbol, IClaims } from '../../models/auth'
import { UnauthorizedError, UnauthorizedReason } from '../../errors'
import { CurrentFireUserIdSymbol, CurrentFireUserSymbol, CurrentUserSymbol } from './common'
import {
  IUserDetailsEntityService,
  IUserEntityService,
  UserDetailsEntityServiceSymbol,
  UserDetailsModel,
  UserEntityServiceSymbol,
  UserModel,
  UserStatus,
} from '../../models/db'
import { CurrentTokenSymbol } from '../../lib/middleware'

export type FireAccessOptions = {
  skipApproved?: true
  skipUserExists?: true
  skipBlockedCheck?: true
  checkRevoked?: true
}

// All property injectibles should go into this interface which is then used for unit testing
export interface IFireAccessMiddleware extends IMiddleware {
  loggerFactory: ILoggerFactory
  userEntityService: IUserEntityService
  userDetailsEntityService: IUserDetailsEntityService
  token: string
  claims?: IClaims | null
}

export function FireAccessMiddleware(options: FireAccessOptions = {}): interfaces.Newable<IMiddleware> {
  @injectable()
  class _FireAccessMiddleware implements IFireAccessMiddleware {
    @inject(LoggerFactorySymbol) loggerFactory!: ILoggerFactory
    @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
    @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService

    @inject(CurrentTokenSymbol) token!: string
    @inject(ClaimsSymbol) claims?: IClaims | null

    public async handle(req: IHttpRequest): Promise<void> {
      await this.checkRevoked()

      const { fireUserUid } = this.claims ?? {}

      if (typeof fireUserUid === 'string') {
        req.container?.rebind<string>(CurrentFireUserIdSymbol).toConstantValue(fireUserUid)

        const user = await this.userEntityService.getOne({ fireUserId: fireUserUid })
        let userDetails = null
        if (user) {
          // TODO: cache user details
          userDetails = await this.userDetailsEntityService.getOne({ userId: user.id })

          req.container?.rebind<UserModel>(CurrentUserSymbol).toConstantValue(user)
        }

        await this.checkUserExists(user)
        await this.checkNotDeleted(userDetails)
        await this.checkNotBlocked(userDetails)
        await this.checkApproved(userDetails)
      } else {
        throw new UnauthorizedError()
      }
    }

    private async checkNotDeleted(userDetails: UserDetailsModel | null) {
      if (!userDetails) {
        return
      }

      if (userDetails.status === UserStatus.DeletePending || userDetails.status === UserStatus.DeleteRetention) {
        throw new UnauthorizedError()
      }
    }

    private async checkNotBlocked(userDetails: UserDetailsModel | null) {
      if (options.skipBlockedCheck || !userDetails) {
        return
      }

      if (userDetails.status === UserStatus.Blocked) {
        throw new UnauthorizedError('', { reason: UnauthorizedReason.Blocked })
      }
    }

    private async checkApproved(userDetails: UserDetailsModel | null) {
      if (options.skipApproved || !userDetails) {
        return
      }

      if (!userDetails!.isApproved) {
        throw new UnauthorizedError()
      }
    }

    private async checkUserExists(user: UserModel | null) {
      if (options.skipUserExists) {
        return
      }

      if (!user) {
        throw new UnauthorizedError()
      }
    }

    private async checkRevoked() {
      if (!options.checkRevoked) {
        return
      }

      await fbAdmin.auth().verifyIdToken(this.token, true)
    }
  }

  return _FireAccessMiddleware
}

2021

import { Route, httpGet, StatusCode, requestParam, BadRequestError } from '@ts-awesome/rest'
import { OpenApiPath, OpenApiOperationGet } from '@ts-awesome/openapi'

import { inject } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { GENERIC_REFERRAL_PATTERN } from '../../middleware/common'
import { IUserReferrerService, UserReferrerServiceSymbol } from '../../services/referrals/user-referrer.service'
import { ConfigSymbol, IConfig } from '@ts-awesome/config'

@httpGet(`/redirect/referral/:referralCode`)
export class GetReferralRedirectRoute extends Route {
  @inject(UserReferrerServiceSymbol) userReferrerService!: IUserReferrerService
  @inject(ConfigSymbol) config!: IConfig

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()
    this.logger = loggerFactory(GetReferralRedirectRoute)
  }

  @OpenApiOperationGet({
    path: '/redirect/referral/:referralCode',
    description: 'Get versions objects list',
    summary: 'Get versions list',
    responses: {
      [StatusCode.TemporaryRedirect]: { description: '' },
    },
  })
  public async handle(@requestParam('referralCode') referralCode: string): Promise<void> {
    this.logger.info(`Referral Redirect Requested: ${referralCode}`)

    referralCode = referralCode ?? ''
    // hard validation to shorten the threat
    let isReferralCodeValid = true

    const validationRegexp = new RegExp(GENERIC_REFERRAL_PATTERN, 'gi')
    isReferralCodeValid = validationRegexp.test(referralCode)

    // shorten the referral code length to prevent overwhelming the DB search times
    if (referralCode.length > 32) {
      isReferralCodeValid = false
    }

    if (!isReferralCodeValid) {
      this.logger.error(`validation error: referral code (${referralCode}) is invalid`)
      throw new BadRequestError('Referral Code is not valid')
    }

    let deepInvitationLink = await this.userReferrerService.getDeepInvitationLink(referralCode)

    // TODO: figure a better fallback
    if (!deepInvitationLink) {
      this.logger.warn(`Deep link for referral code (${referralCode}) was not found. Falling back to home deep link`)
      deepInvitationLink = this.config.get<string>('deepLinkHome')
    }

    if (!deepInvitationLink) {
      this.logger.error(`critical: deep link for referral code (${referralCode}) was not retrieved`)
      this.text('Oops, we could not find the referral link you requested', StatusCode.NotFound)

      return
    }

    this.redirect(deepInvitationLink, StatusCode.TemporaryRedirect)
  }
}

OpenApiPath({
  path: '/redirect/referral',
  tag: 'Referral Redirects',
})

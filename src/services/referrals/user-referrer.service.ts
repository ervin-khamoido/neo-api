2021

import { inject, injectable } from 'inversify'
import { ConfigSymbol, ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IConfig } from 'config'
import crypto from 'crypto'

import { CustomErrorType, DuplicateFieldError } from '../../errors'
import { NGN, USDC } from '../../utils/formatter'

import {
  IUserDetailsEntityService,
  IUserEntityService,
  IUserReferrerEntityService,
  UserDetailsEntityServiceSymbol,
  UserEntityServiceSymbol,
  UserReferrerEntityServiceSymbol,
  ReferralLevelEntityServiceSymbol,
  IReferralLevelEntityService,
  ReferralLevel,
  AmbassadorLevelEntityServiceSymbol,
  IAmbassadorLevelEntityService,
  IUserReferrerPayoutDetails,
} from '../../models/db'

import { AppConfigSymbol, IAppConfig } from '../../models/config'

import { BranchIOServiceSymbol, IBranchIOService } from '../branch.service'
import { ReferrerInfoOutput, ReferrerVerifyOutput, UpdateReferralCodeOutput } from '../../models/response'
import { IUserStatusService, UserStatusServiceSymbol } from '../user-status.service'
import { AmbassadorServiceSymbol, IAmbassadorService } from '../ambassador.service'
import { IReferralConfig, ReferralConfigSymbol } from '../../models/config/referral.config'

interface IUserReferralCodeInfoResult {
  referralCode: string
  referralLink: string | null
  referralPrettyLink: string | null
}

export const REFERRAL_CODE_SIZE = 8

export interface IUserReferrerService {
  // TODO: refactor
  generateDeepInvitationLink(referrerCode: string): Promise<string>
  getDeepInvitationLink(referrerCode: string): Promise<string | null>
  getOrCreateInvitationLink(userId: number): Promise<string | null>

  getReferrerInfo(userId: number): Promise<ReferrerInfoOutput>

  generateReferralCode(size: number): Promise<string>
  changeReferralCode(email: string, referrerCode: string): Promise<UpdateReferralCodeOutput>

  verifyReferrer(referralCode: string): Promise<ReferrerVerifyOutput>
  getReferrerPayoutAndDetails(userId: number): Promise<[number, IUserReferrerPayoutDetails] | null>
  getMaxReferrerPayoutsCount(userId: number): Promise<number | null>
}

export const UserReferrerServiceSymbol = Symbol.for('IUserReferrerService')

@injectable()
export class UserReferrerService implements IUserReferrerService {
  @inject(AppConfigSymbol) appConfig!: IAppConfig
  @inject(ConfigSymbol) config!: IConfig
  @inject(ReferralConfigSymbol) referralConfig!: IReferralConfig

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(BranchIOServiceSymbol) branchIOService!: IBranchIOService

  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserReferrerEntityServiceSymbol) userReferrerEntityService!: IUserReferrerEntityService
  @inject(ReferralLevelEntityServiceSymbol) referralLevelService!: IReferralLevelEntityService
  @inject(UserStatusServiceSymbol) userStatusService!: IUserStatusService

  @inject(AmbassadorServiceSymbol) ambassadorService!: IAmbassadorService
  @inject(AmbassadorLevelEntityServiceSymbol) ambassadorLevelEntityService!: IAmbassadorLevelEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserReferrerService)
  }

  // TODO: add max retries count/recursion depth. Task: https://app.shortcut.com/neobank-app/story/4046
  async generateReferralCode(size: number): Promise<string> {
    // relates to GENERIC_REFERRAL_PATTERN, when you change this change the regex in there as well
    const values = 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789'

    let code = ''
    for (let i = 0; i < size; i++) {
      const randomValue = crypto.randomInt(values.length)
      code += values.charAt(randomValue)
    }

    // If the code already exists in the DB, generate a new one
    const codeExists = await this.referralCodeExists(code)
    if (codeExists) {
      this.logger.warn(`generateReferrerCode(size: number): Regenerating the referral code. Duplicate: ${code}`)
      return await this.generateReferralCode(size)
    }

    return code
  }

  async generateDeepInvitationLink(referrerCode: string): Promise<string> {
    const { url } = await this.branchIOService.link({
      channel: 'referral',
      identity: referrerCode,
      alias: referrerCode,
      feature: 'referral',
      data: {
        referrerCode: referrerCode,
      },
    })

    return url
  }

  async getDeepInvitationLink(referrerCode: string): Promise<string | null> {
    // this method should be dumb, we don't need to do any checks here

    const [userReferrer, userDetails] = await Promise.all([
      this.userReferrerEntityService.getOne({ referralCode: referrerCode }),
      // Fallback for older version of referral links
      this.userDetailsEntityService.getOne({ referrerCode: referrerCode }),
    ])

    const referralLink = userReferrer?.referralLink ?? userDetails?.invitationLink

    return referralLink!
  }

  async getOrCreateInvitationLink(userId: number): Promise<string | null> {
    const referralCodeInfoResult = await this.getReferralCodeAndLink(userId)

    return referralCodeInfoResult.referralPrettyLink ?? referralCodeInfoResult.referralLink
  }

  private async generatePrettyInvitationLink(referralCode: string): Promise<string | null> {
    if (!referralCode) {
      this.logger.warn('generatePrettyInvitationLink: invalid referral code')

      return Promise.resolve(null)
    }

    const prettyLinkHost = this.referralConfig.prettyLinkHost
    if (!prettyLinkHost) {
      this.logger.error(`generatePrettyInvitationLink: prettyLinkHost (${prettyLinkHost}) is not valid`)

      return Promise.resolve(null)
    }

    return Promise.resolve(`${prettyLinkHost}/${referralCode}`)
  }

  async getReferrerInfo(userId: number): Promise<ReferrerInfoOutput> {
    const [
      referralCodeInfoResult,
      referrerPayoutDetails,
      //
    ] = await Promise.all([
      this.getReferralCodeAndLink(userId),
      this.getReferrerPayoutAndDetails(userId),
      //
    ])
    const [referrerPayout, details] = referrerPayoutDetails ?? [0, { minRefereeSaveAmountUsdc: 0, version: 'v1' }]
    const neobankAppLink = this.config.get<string>('deepLinkHome')

    // Rare case when invitation link can't be generated
    const referralLink = referralCodeInfoResult.referralPrettyLink ?? referralCodeInfoResult.referralLink ?? ''

    const marketingText = referralLink
      ? `Click the link below to download the Neobank app and protect your savings: ${referralLink}`
      : `Download the Neobank App ${neobankAppLink} and use my referral code ${referralCodeInfoResult.referralCode} during registration`

    const displayPayout = referrerPayout > 0 ? `${NGN(referrerPayout, false)} ` : ''
    const referralConditions = `Share Neobank App with your friends and get ${displayPayout} for each one that deposits at least $5.`

    return {
      referralCode: referralCodeInfoResult.referralCode,
      referralLink: referralLink,
      // Markdown is supported!
      // document this in Airtable for the marketing team
      referralConditions: referralConditions,
      invitationText: marketingText,
      rewardDetails: {
        isActive: referrerPayout > 0,
        shortReferralRewardInfo: referrerPayout > 0 ? `Invite Friends, Get ${NGN(referrerPayout, false)}` : null,
      },
    }
  }

  async verifyReferrer(referralCode: string): Promise<ReferrerVerifyOutput> {
    const formattedReferralCode = referralCode?.toUpperCase()

    if (!referralCode) {
      return { verified: false, referralCode: formattedReferralCode, reason: 'The referral code is empty' }
    }

    let [userReferrer, userDetails] = await Promise.all([
      this.userReferrerEntityService.getOne({ referralCode: formattedReferralCode }),
      this.userDetailsEntityService.getOne({ referrerCode: formattedReferralCode }),
    ])

    if (userReferrer) {
      userDetails = await this.userDetailsEntityService.getOne({ userId: userReferrer.userId })
    }

    if (!userDetails) {
      this.logger.warn(`The referral code was not found`)
      return { verified: false, referralCode: formattedReferralCode, reason: 'The referral code is not valid' }
    }

    const userStatus = await this.userStatusService.calculateUserStatus(userDetails.userId)
    const isUserActive = await this.userStatusService.isActive(userStatus)

    if (!isUserActive) {
      this.logger.warn(`The referrer is in status "${userStatus}". Referral Code: ${formattedReferralCode}`)
      return { verified: false, referralCode: formattedReferralCode, reason: 'The referral code is not valid' }
    }

    return { verified: true, referralCode: formattedReferralCode }
  }

  // Adapter to handle old and new DB records
  private async getReferralCodeAndLink(userId: number): Promise<IUserReferralCodeInfoResult> {
    const userDetails = await this.userDetailsEntityService.getOne({ userId: userId })
    if (!userDetails) {
      throw new Error('unexpected: failed to get user details')
    }

    let userReferrer = await this.userReferrerEntityService.getOne({ userId: userId })
    if (!userReferrer) {
      try {
        const referralLevel0 = await this.referralLevelService.getOne({ code: ReferralLevel.Level0 })
        userReferrer = await this.userReferrerEntityService.addOne({
          userId: userId,
          referralLink: userDetails.invitationLink,
          referralCode: userDetails.referrerCode!,
          referralLevelId: referralLevel0!.id,
        })
      } catch (err: any) {
        // the code below still will be able to handle the request
        // but the data will be pulled from the user_details table
        this.logger.error(err, 'critical: the data from user_details can not be migrated to user_referrer')
      }
    }

    const referralCode = userReferrer?.referralCode ?? userDetails!.referrerCode!
    let referralLink = userReferrer?.referralLink ?? userDetails?.invitationLink ?? null

    if (!referralLink) {
      try {
        const invitationLink = await this.generateDeepInvitationLink(referralCode)

        await this.userDetailsEntityService.updateOne({
          userId: userId,
          invitationLink: invitationLink,
          updatedBy: null,
        })
        if (userReferrer) {
          await this.userReferrerEntityService.updateOne({ userId: userId, referralLink: invitationLink })
        }

        referralLink = invitationLink
      } catch (err: any) {
        this.logger.error(err, `Error trying to generate a link for user: ${userId}`)
      }
    }

    let referralPrettyLink: string | null = null
    if (referralLink) {
      referralPrettyLink = await this.generatePrettyInvitationLink(referralCode)
    }

    return {
      referralCode: referralCode,
      referralLink: referralLink,
      referralPrettyLink: referralPrettyLink,
    }
  }

  async changeReferralCode(email: string, referralCode: string): Promise<UpdateReferralCodeOutput> {
    const user = await this.userEntityService.getOne({ email: email })
    if (!user) {
      return {
        success: false,
        error: {
          type: CustomErrorType.Validation,
          code: 'user_not_found',
          message: 'No user with the specified email exists.',
        },
      }
    }

    const codeExists = await this.referralCodeExists(referralCode)
    if (codeExists) {
      return {
        success: false,
        error: {
          type: CustomErrorType.Validation,
          code: 'duplicate_referral_code',
          message: 'The requested referral code is already assigned to an existing user.',
        },
      }
    }

    try {
      await Promise.all([
        this.userReferrerEntityService.updateOne({
          userId: user.id,
          referralCode: referralCode,
          referralLink: null,
        }),
        this.userDetailsEntityService.updateOne({
          userId: user.id,
          referrerCode: referralCode,
          invitationLink: null,
          updatedBy: null,
        }),
      ])

      return {
        success: true,
      }
    } catch (err: any) {
      this.logger.error(err)

      let code = ''
      let message = ''
      if (err instanceof DuplicateFieldError) {
        code = 'duplicate_referral_code'
        message = 'The requested referral code is already assigned to an existing user.'
      } else {
        code = 'unexpected_error'
        message = 'An unexpected error occurred while attempting the referral code update.'
      }

      return {
        success: false,
        error: {
          type: CustomErrorType.Validation,
          code: code,
          message: message,
        },
      }
    }
  }

  private async referralCodeExists(code: string): Promise<boolean> {
    const [userDetailsCodeExists, userReferrerCodeExists] = await Promise.all([
      this.userDetailsEntityService
        .select()
        .where(x => x.referrerCode.eq(code))
        .exists(),
      this.userReferrerEntityService
        .select()
        .where(x => x.referralCode.eq(code))
        .exists(),
    ])

    return userReferrerCodeExists || userDetailsCodeExists
  }

  async getReferrerPayoutAndDetails(userId: number): Promise<[number, IUserReferrerPayoutDetails] | null> {
    const [userReferrer, userAmbassador] = await Promise.all([
      this.userReferrerEntityService.getOne({ userId }),
      this.ambassadorService.getActiveAmbassador(userId),
    ])

    if (userAmbassador) {
      const ambassadorLevel = await this.ambassadorLevelEntityService.getOne({ id: userAmbassador.ambassadorLevelId })

      return [
        ambassadorLevel!.flatReward,
        { version: 'v1', minRefereeSaveAmountUsdc: ambassadorLevel!.minRefereeSaveAmountUsdc },
      ]
    } else if (userReferrer) {
      const userReferralLevel = await this.referralLevelService.getOne({ id: userReferrer.referralLevelId })

      return [
        userReferralLevel!.flatReward,
        { version: 'v1', minRefereeSaveAmountUsdc: userReferralLevel!.minRefereeSaveAmountUsdc },
      ]
    } else {
      this.logger.error('neither UserReferral nor UserAmbassador is found')

      return null
    }
  }

  async getMaxReferrerPayoutsCount(userId: number): Promise<number | null> {
    const [userReferrer, userAmbassador] = await Promise.all([
      this.userReferrerEntityService.getOne({ userId }),
      this.ambassadorService.getActiveAmbassador(userId),
    ])

    if (userAmbassador) {
      const ambassadorLevel = await this.ambassadorLevelEntityService.getOne({ id: userAmbassador.ambassadorLevelId })
      return ambassadorLevel!.maxPayoutsCount
    }

    const userReferralLevel = await this.referralLevelService.getOne({ id: userReferrer!.referralLevelId })
    return userReferralLevel!.maxPayoutsCount
  }
}

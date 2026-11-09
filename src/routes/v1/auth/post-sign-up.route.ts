2021

import { inject, named } from 'inversify'
import fbAdmin from 'firebase-admin'
import { IConfig } from 'config'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator, ValidatorSymbol } from '@ts-awesome/validate'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { ConfigSymbol } from '@ts-awesome/config'

import {
  EmailVerificationEntityServiceSymbol,
  IEmailVerificationEntityService,
  IMaxApprovedUsersEntityService,
  IModernTreasuryWalletEntityService,
  IReferralLevelEntityService,
  IUserDetailsEntityService,
  IUserEntityService,
  IUserLevelEntityService,
  IUserReferrerEntityService,
  IUserReferrerRegistrationEntityService,
  IUserWalletEntityService,
  IWalletEntityService,
  MaxApprovedUsersEntityServiceSymbol,
  MaxApprovedUsersModel,
  ModernTreasuryWalletEntityServiceSymbol,
  MTNormalBalanceType,
  ReferralLevel,
  ReferralLevelEntityServiceSymbol,
  UserDetailsEntityServiceSymbol,
  UserEntityServiceSymbol,
  UserLevel,
  UserLevelEntityServiceSymbol,
  UserModel,
  UserReferrerEntityServiceSymbol,
  UserReferrerModel,
  UserReferrerRegistrationEntityServiceSymbol,
  UserStatus,
  UserWalletEntityServiceSymbol,
  WalletEntityServiceSymbol,
} from '../../../models/db'
import { AuthOutput } from '../../../models/response'
import { SignUpInput } from '../../../models/request'

import { IUserService, UserServiceSymbol } from '../../../lib/user.service'
import { ClaimsSymbol, IClaims } from '../../../models/auth'
import { AuthTokenServiceSymbol, ITokenService } from '../../../lib/services/token'

import validation from '../../../lib/utils/validation'

import { CurrentFireUserSymbol, RegistrationAccessMiddleware } from '../../../middleware'
import { AuthTokenConfigSymbol, ITokenConfig } from '../../../lib/models/config'
import { desc } from '@ts-awesome/orm'
import { AppConfigSymbol, IAppConfig, IModernTreasuryConfig, ModernTreasuryConfigSymbol } from '../../../models/config'
import { IModernTreasuryService, ModernTreasuryServiceSymbol } from '../../../services/modern-treasury.service'
import { WalletCategoryType, WalletType } from '../../../models/modern-treasury'
import { IUserSettingsService, UserSettingsServiceSymbol } from '../../../services/user-settings.service'
import { IUserSecretsService, UserSecretsServiceSymbol } from '../../../services/user-secrets.service'
import { AppNotSupportedHttpError, ConflictError, UnauthorizedError } from '../../../errors'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { IMailerService, MailerServiceSymbol } from '../../../lib/services/mailer'
import { MailTemplates } from '../../../services/mailer/mailgun.service'
import { IUserStatusService, UserStatusServiceSymbol } from '../../../services/user-status.service'
import {
  IUserReferrerService,
  REFERRAL_CODE_SIZE,
  UserReferrerServiceSymbol,
} from '../../../services/referrals/user-referrer.service'
import {
  IUserReferrerPayoutService,
  UserReferrerPayoutServiceSymbol,
} from '../../../services/referrals/user-referrer-payout.service'
import { STATUS_CODE_GONE } from '../../../common/constants'
import { FeatureConfigSymbol, IFeatureConfig } from '../../../models/config/feature.config'

// BREAKING CHANGE ROUTE: remove it after 2.5.0 gets deprecated
@httpPost('/api/v1/auth/signup', RegistrationAccessMiddleware)
export class PostSignUpRoute extends Route {
  @inject(ConfigSymbol) config!: IConfig
  @inject(AppConfigSymbol) appConfig!: IAppConfig
  @inject(ModernTreasuryConfigSymbol) modernTreasuryConfig!: IModernTreasuryConfig
  @inject(FeatureConfigSymbol) featureConfig!: IFeatureConfig

  @inject(ValidatorSymbol) @named('phone') phoneValidator!: IValidator<string>

  @inject(AuthTokenConfigSymbol) aTokenConfig!: ITokenConfig
  @inject(AuthTokenServiceSymbol) tokenService!: ITokenService<IClaims>

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserServiceSymbol) userService!: IUserService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserLevelEntityServiceSymbol) userLevel!: IUserLevelEntityService
  @inject(UserReferrerRegistrationEntityServiceSymbol)
  userReferrerRegistrationEntityService!: IUserReferrerRegistrationEntityService
  @inject(EmailVerificationEntityServiceSymbol) emailVerificationService!: IEmailVerificationEntityService
  @inject(MaxApprovedUsersEntityServiceSymbol) maxApprovedUsersService!: IMaxApprovedUsersEntityService
  @inject(UserSettingsServiceSymbol) userSettingsService!: IUserSettingsService
  @inject(UserSecretsServiceSymbol) userSecretsService!: IUserSecretsService
  @inject(MailerServiceSymbol) mailerService!: IMailerService
  @inject(UserReferrerServiceSymbol) userReferrerService!: IUserReferrerService

  @inject(ClaimsSymbol) claims!: IClaims | null
  @inject(CurrentFireUserSymbol) fireUser!: fbAdmin.auth.UserRecord

  @inject(validation.symbolFor(SignUpInput))
  bodyValidator!: IValidator<SignUpInput>

  @inject(UnitOfWorkSymbol)
  uow!: IUnitOfWork<void>

  private readonly logger: ILogger
  private readonly MAX_RETRY_COUNT = 5

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostSignUpRoute)
  }

  @OpenApiOperationPost({
    path: '/api/v1/auth/signup',
    description: 'Sign up in system',
    summary: 'POST user email code',
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        required: true,
        description: 'User profile',
        schema: SignUpInput,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Token when successfully created', content: AuthOutput },
      [StatusCode.Conflict]: { description: 'User with a such email or phone already exists' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [STATUS_CODE_GONE]: { description: 'The app is not longer supported' },
    },
    deprecated: true,
  })
  async handle(@requestBody(SignUpInput, true) body: SignUpInput): Promise<void> {
    if (!this.featureConfig.signUpV1) {
      throw new AppNotSupportedHttpError()
    }

    const result = this.phoneValidator.validate(this.fireUser.phoneNumber!, { required: true })
    if (result !== true) {
      throw new BadRequestError(result.join('\n'))
    }

    const { emailVerificationId } = this.claims ?? {}
    if (typeof emailVerificationId != 'string') {
      throw new UnauthorizedError('Please verify you email first')
    }

    const emailVerification = await this.emailVerificationService.getOne({ uid: emailVerificationId })
    if (!emailVerification) {
      throw new UnauthorizedError('Please verify your email. Email verification record not found')
    }

    const [user, userReferrer] = await this.uow.auto(() => this.create(body, emailVerification.email))

    const neoBankAppLink = this.config.get<string>('deepLinkHome')
    await this.mailerService.send({
      subject: '💰Welcome to Neo Bank! Start saving today!',
      to: user.email,
      template: {
        name: MailTemplates.NewAccount,
        variables: {
          invitation_link: userReferrer.referralLink ?? '',
          neo_bank_app_link: neoBankAppLink ?? '',
        },
        conditionalContent: {
          neo_bank_app_link: neoBankAppLink ? true : false,
          invitation_link: userReferrer.referralLink ? true : false,
        },
      },
    })

    return this.json({ exists: true, verified: true }, StatusCode.Created, AuthOutput)
  }

  private async create(body: SignUpInput, email: string): Promise<[UserModel, UserReferrerModel]> {
    const approvedCountPromise = this.userDetailsEntityService.count({ isApproved: true })
    const maxApprovedUsersPromise = this.maxApprovedUsersService
      .select()
      .orderBy(x => [desc(x.createdAt)])
      .fetchOne(MaxApprovedUsersModel)
    const userLevel0Promise = this.userLevel.getOne({ code: UserLevel.Level0 })

    const [approvedCount, maxApprovedUsers, userLevel0] = await Promise.all([
      approvedCountPromise,
      maxApprovedUsersPromise,
      userLevel0Promise,
    ])

    const user = await this.userService.create({
      fireUserId: this.fireUser.uid,
      phone: this.fireUser.phoneNumber!,
      email,
    })

    const maxApprovedValue = maxApprovedUsers?.value ?? 0
    const isApproved = approvedCount < maxApprovedValue

    const userDetailsPromise = this.userDetailsEntityService.addOne({
      userId: user.id,
      isApproved: isApproved,
      userLevelId: userLevel0!.id,
      avatarUrl: null,
      fullName: null,
      invitationLink: null,
      phone: user.phone,
      email: user.email,
      status: UserStatus.Active,
      firstName: null,
      middleName: null,
      lastName: null,
      dateOfBirth: null,
      country: null,
      address: null,
      username: null,
      updatedBy: null,
    })

    const userSettingsPromise = this.userSettingsService.createDefaultUserSettings(user.id)
    const userSecretsPromise = this.userSecretsService.createDefaultUserSecrets(user.id)

    const userReferrerPromise = this.createUserReferrer(user)
    const userRefereePromise = this.createUserReferee(user, body.referrerCode)
    const walletPromise = this.createSavingWallet(user)

    const [userReferrer] = await Promise.all([
      userReferrerPromise,

      // return ignored
      userDetailsPromise,
      userSettingsPromise,
      userSecretsPromise,
      userRefereePromise,
      walletPromise,
    ])

    // TODO: figure how we can silently update the user without breaking user auth on the device
    // Problem: the user's ID token is revoked when user data is updated
    // await fbAdmin.auth().updateUser(this.fireUser.uid, { email })

    return [user, userReferrer]
  }

  @inject(ModernTreasuryServiceSymbol) modernTreasuryService!: IModernTreasuryService
  @inject(WalletEntityServiceSymbol) walletService!: IWalletEntityService
  @inject(UserWalletEntityServiceSymbol) userWalletService!: IUserWalletEntityService
  @inject(ModernTreasuryWalletEntityServiceSymbol)
  modernTreasuryWalletEntityService!: IModernTreasuryWalletEntityService

  // TODO: what if create fails on our side?
  private async createSavingWallet(user: UserModel) {
    const wallet = await this.walletService.addOne({ type: WalletType.Saving })
    await this.userWalletService.addOne({
      userId: user.id,
      walletId: wallet.id,
    })
    const walletName = `u:${user.uid}:${wallet.uid}`

    const account = await this.modernTreasuryService.createAccount({
      name: walletName,
      ledger_id: this.modernTreasuryConfig.ledgerId,
      normal_balance: MTNormalBalanceType.Credit,
      metadata: {
        category: WalletCategoryType.User,
        type: WalletType.Saving,
        owner: user.uid,
        wallet: wallet.uid,
      },
    })

    await this.modernTreasuryWalletEntityService.addOne({
      walletId: wallet.id,

      name: account.name,
      ledgerAccountId: account.id,
      ledgerId: account.ledger_id,
      normalBalance: account.normal_balance,
      object: account.object ?? '',
      callbackUrl: null,
      description: null,
    })
  }

  @inject(ReferralLevelEntityServiceSymbol) referralLevelEntityService!: IReferralLevelEntityService
  @inject(UserReferrerEntityServiceSymbol) userReferrerEntityService!: IUserReferrerEntityService
  @inject(UserStatusServiceSymbol) userStatusService!: IUserStatusService
  @inject(UserReferrerPayoutServiceSymbol) userReferrerPayoutService!: IUserReferrerPayoutService

  private async createUserReferrer(user: UserModel): Promise<UserReferrerModel> {
    const referralLevel0 = await this.referralLevelEntityService.getOne({ code: ReferralLevel.Level0 })

    let referralCode: string | null = null
    let userReferrer: UserReferrerModel | null = null
    for (let retryCount = 0; retryCount < this.MAX_RETRY_COUNT; ++retryCount) {
      referralCode = await this.userReferrerService.generateReferralCode(REFERRAL_CODE_SIZE)
      userReferrer = await this.userReferrerEntityService.insertDoNothingOnConflict({
        userId: user.id,
        referralCode: referralCode,
        referralLink: null,
        referralLevelId: referralLevel0!.id,
      })
      await this.userDetailsEntityService.updateOne({ userId: user.id, referrerCode: referralCode })

      if (userReferrer) {
        break
      }
    }

    // We've reached the retry limit - attempting a final time without the on conflict handling so we can throw the correct error
    if (!userReferrer) {
      try {
        referralCode = await this.userReferrerService.generateReferralCode(REFERRAL_CODE_SIZE)
        userReferrer = await this.userReferrerEntityService.addOne({
          userId: user.id,
          referralCode: referralCode,
          referralLink: null,
          referralLevelId: referralLevel0!.id,
        })
      } catch (err: any) {
        throw new ConflictError(err)
      }
    }

    try {
      // TODO: refactor, move the logic to appropriate service (user-referrer.service)
      const referralLink = await this.userReferrerService.generateDeepInvitationLink(userReferrer.referralCode)
      userReferrer = await this.userReferrerEntityService.updateOne({
        userId: user.id,
        referralLink: referralLink,
      })
      await this.userDetailsEntityService.updateOne({ userId: user.id, invitationLink: referralLink })
    } catch (err: any) {
      this.logger.warn('unexpected: could not update invitation link')
      this.logger.error(err)
    }

    return userReferrer!
  }

  private async createUserReferee(user: UserModel, referrerCode?: string | null) {
    // If the user entered a referrer code on signup, add a record to the user referrer registration table
    if (!referrerCode) {
      return
    }

    const verification = await this.userReferrerService.verifyReferrer(referrerCode)
    if (verification.verified) {
      const referrerUser = await this.userReferrerEntityService.getOne({ referralCode: verification.referralCode! })
      const referrerRegistrationPromise = this.userReferrerRegistrationEntityService.addOne({
        referrerUserId: referrerUser!.userId,
        createdUserId: user.id,
      })
      // schedule a payout for the referrer
      const deferredPayoutPromise = this.userReferrerPayoutService.createDeferredPayout(referrerUser!.userId, user.id)

      await Promise.all([referrerRegistrationPromise, deferredPayoutPromise])
    }
  }
}

2021

import { inject, named } from 'inversify'
import fbAdmin from 'firebase-admin'
import { IConfig } from 'config'
import { differenceInCalendarYears } from 'date-fns'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator, ValidatorSymbol } from '@ts-awesome/validate'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { ConfigSymbol } from '@ts-awesome/config'
import { DuplicateValueDbError } from '@ts-awesome/orm-pg'
import { desc } from '@ts-awesome/orm'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  Country,
  EmailVerificationEntityServiceSymbol,
  IEmailVerificationEntityService,
  IMaxApprovedUsersEntityService,
  IReferralLevelEntityService,
  IUserDetailsEntityService,
  IUserEntityService,
  IUserLevelEntityService,
  IUserReferrerEntityService,
  IUserReferrerRegistrationEntityService,
  MaxApprovedUsersEntityServiceSymbol,
  MaxApprovedUsersModel,
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
} from '../../../models/db'
import { AuthOutput } from '../../../models/response'
import { SignUpV2Input } from '../../../models/request'
import { ClaimsSymbol, IClaims } from '../../../models/auth'
import { IUserService, UserServiceSymbol } from '../../../lib/user.service'
import { AuthTokenServiceSymbol, ITokenService } from '../../../lib/services/token'
import validation from '../../../lib/utils/validation'

import { CurrentFireUserSymbol, RegistrationAccessMiddleware } from '../../../middleware'
import { AuthTokenConfigSymbol, ITokenConfig } from '../../../lib/models/config'
import { AppConfigSymbol, IAppConfig } from '../../../models/config'
import { IUserSettingsService, UserSettingsServiceSymbol } from '../../../services/user-settings.service'
import { IUserSecretsService, UserSecretsServiceSymbol } from '../../../services/user-secrets.service'
import { ConflictError, UnauthorizedError } from '../../../errors'
import { IMailerService, MailerServiceSymbol } from '../../../lib/services/mailer'

import { MailTemplates } from '../../../services/mailer/mailgun.service'
import { IUserStatusService, UserStatusServiceSymbol } from '../../../services/user-status.service'
import { IUsernameService, UsernameServiceSymbol } from '../../../services/username.service'

import {
  IUserReferrerService,
  REFERRAL_CODE_SIZE,
  UserReferrerServiceSymbol,
} from '../../../services/referrals/user-referrer.service'
import {
  IUserReferrerPayoutService,
  UserReferrerPayoutServiceSymbol,
} from '../../../services/referrals/user-referrer-payout.service'
import { IUserFullNameService, UserFullNameServiceSymbol } from '../../../services/user-full-name.service'
import { IWalletService, WalletServiceSymbol } from '../../../services/wallet.service'

@httpPost('/api/v2/auth/signup', RegistrationAccessMiddleware)
export class PostSignUpV2Route extends Route {
  @inject(CurrentFireUserSymbol) fireUser!: fbAdmin.auth.UserRecord
  @inject(ClaimsSymbol) claims!: IClaims | null

  @inject(ConfigSymbol) config!: IConfig
  @inject(AppConfigSymbol) appConfig!: IAppConfig
  @inject(AuthTokenConfigSymbol) aTokenConfig!: ITokenConfig

  @inject(validation.symbolFor(SignUpV2Input)) bodyValidator!: IValidator<SignUpV2Input>
  @inject(ValidatorSymbol) @named('phone') phoneValidator!: IValidator<string>

  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService
  @inject(UserLevelEntityServiceSymbol) userLevel!: IUserLevelEntityService
  @inject(UserReferrerRegistrationEntityServiceSymbol)
  userReferrerRegistrationEntityService!: IUserReferrerRegistrationEntityService
  @inject(EmailVerificationEntityServiceSymbol) emailVerificationService!: IEmailVerificationEntityService
  @inject(MaxApprovedUsersEntityServiceSymbol) maxApprovedUsersService!: IMaxApprovedUsersEntityService

  @inject(AuthTokenServiceSymbol) tokenService!: ITokenService<IClaims>
  @inject(UserServiceSymbol) userService!: IUserService
  @inject(UserSettingsServiceSymbol) userSettingsService!: IUserSettingsService
  @inject(UserSecretsServiceSymbol) userSecretsService!: IUserSecretsService
  @inject(MailerServiceSymbol) mailerService!: IMailerService
  @inject(UserReferrerServiceSymbol) userReferrerService!: IUserReferrerService
  @inject(UsernameServiceSymbol) usernameService!: IUsernameService
  @inject(UserFullNameServiceSymbol) userFullNameService!: IUserFullNameService
  @inject(WalletServiceSymbol) walletService!: IWalletService

  private readonly logger: ILogger
  private readonly MAX_RETRY_COUNT = 5

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    super()

    this.logger = loggerFactory(PostSignUpV2Route)
  }

  @OpenApiOperationPost({
    path: '/api/v2/auth/signup',
    description: 'Sign up in system',
    summary: `POST user's sign up data`,
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        required: true,
        description: `User's sign up info`,
        schema: SignUpV2Input,
      },
    },
    responses: {
      [StatusCode.Created]: { description: 'Token when successfully created', content: AuthOutput },
      [StatusCode.Conflict]: { description: 'User with a such email or phone already exists' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
    },
  })
  async handle(@requestBody(SignUpV2Input, true) body: SignUpV2Input): Promise<void> {
    this.validate(this.bodyValidator, body)
    this.fixCountryForBackwardCompatibility(body)

    // validate date of birth
    const dateOfBirth = body.dateOfBirth
    const currentDate = new Date()
    const differenceInYears = differenceInCalendarYears(currentDate, dateOfBirth)
    if (differenceInYears < 18) {
      throw new BadRequestError('The user must be at least 18 years old')
    }

    const usernameResult = await this.usernameService.validate(body.username)
    if (!usernameResult.valid) {
      throw new BadRequestError(usernameResult.errors!.join('\n'))
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

    const neobankAppLink = this.config.get<string>('deepLinkHome')
    await this.mailerService.send({
      subject: '💰Welcome to Neobank! Start saving today!',
      to: user.email,
      template: {
        name: MailTemplates.NewAccount,
        variables: {
          invitation_link: userReferrer.referralLink ?? '',
          neobank_app_link: neobankAppLink ?? '',
        },
        conditionalContent: {
          neobank_app_link: neobankAppLink ? true : false,
          invitation_link: userReferrer.referralLink ? true : false,
        },
      },
    })

    return this.json({ exists: true, verified: true }, StatusCode.Created, AuthOutput)
  }

  private async create(body: SignUpV2Input, email: string): Promise<[UserModel, UserReferrerModel]> {
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

    try {
      const userFullName = this.userFullNameService.compose(body)

      await this.userDetailsEntityService.addOne({
        userId: user.id,
        isApproved: isApproved,
        userLevelId: userLevel0!.id,
        avatarUrl: null,
        fullName: userFullName,
        invitationLink: null,
        phone: user.phone,
        email: user.email,
        status: UserStatus.Active,
        firstName: body.firstName,
        middleName: body.middleName ?? null,
        lastName: body.lastName,
        dateOfBirth: body.dateOfBirth,
        country: body.country,
        address: body.address ?? null,
        username: body.username,
        updatedBy: null,
      })
    } catch (err) {
      if (err instanceof DuplicateValueDbError && err.column === 'username') {
        throw new BadRequestError(`${body.username} is not available, try a different username`)
      }

      throw err
    }

    const userSettingsPromise = this.userSettingsService.createDefaultUserSettings(user.id)
    const userSecretsPromise = this.userSecretsService.createDefaultUserSecrets(user.id)

    const userReferrerPromise = this.createUserReferrer(user)
    const userRefereePromise = this.createUserReferee(user, body.referrerCode)
    const walletPromise = this.walletService.createSavingWallet(user)

    const [userReferrer] = await Promise.all([
      userReferrerPromise,

      // return ignored
      userSettingsPromise,
      userSecretsPromise,
      userRefereePromise,
      walletPromise,
    ])

    try {
      await this.walletService.createYieldWallet(user)
    } catch (err) {
      // do not stop the flow
      // the yield wallet will be generated in yield-processor if it does not exist
      this.logger.error('critical: could not create user yield wallet', { user: user.uid })
    }

    // TODO: figure how we can silently update the user without breaking user auth on the device
    // Problem: the user's ID token is revoked when user data is updated
    // await fbAdmin.auth().updateUser(this.fireUser.uid, { email })

    return [user, userReferrer]
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

  private fixCountryForBackwardCompatibility(body: SignUpV2Input): void {
    // --- Backward compatability
    if ((body.country as string) === 'Nigeria') {
      body.country = Country.Nigeria
    }

    if (body.address && (body.address.country as string) === 'Nigeria') {
      body.address.country = Country.Nigeria
    }
    // ----
  }
}

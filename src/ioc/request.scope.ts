2021

import { Container, interfaces } from 'inversify'
import { IConfig } from 'config'
import { IBuildableQueryCompiler, IQueryDriver, Symbols as OrmSymbols, TableMetaProvider } from '@ts-awesome/orm'
import { ISqlQuery } from '@ts-awesome/orm-pg'
import {
  EntityService,
  IEntityService,
  IQueryExecutorProvider,
  IUnitOfWork,
  Symbols as EntitySymbols,
  UnitOfWork,
} from '@ts-awesome/entity'
import {
  ConfigSymbol,
  ILoggerDriver,
  ILoggerFactory,
  Logger,
  LoggerDriverSymbol,
  LoggerFactorySymbol,
} from '@ts-awesome/logger'
import fbAdmin from 'firebase-admin'

import {
  AuthTokenService,
  AuthTokenServiceSymbol,
  ConfirmTokenService,
  ConfirmTokenServiceSymbol,
  IConfirmPayload,
  ITokenService,
} from '../lib/services/token'
import { IUserService, UserService, UserServiceSymbol } from '../lib/user.service'
import { ConsoleMailerService, IMailerService, MailerProvider, MailerServiceSymbol } from '../lib/services/mailer'
import { TwilioService } from '../lib/services/sms'
import { ConsoleSMSService, ISMSService, SMSProvider, SMSServiceSymbol } from '../services/sms'

import { IClaims } from '../models/auth'

import {
  EmailVerificationModel,
  InvitationModel,
  MaxApprovedUsersModel,
  UserModel,
  UserReferrerRegistrationModel,
  UserWalletModel,
  WalletBalanceModel,
  WalletModel,
  FeeModel,
  BankModel,
  BankConfigModel,
  UserBankAccountModel,
  UserBankAccountConfigModel,
  UserDetailsModel,
  LiquidityProviderModel,
  LiquidityProviderConfigModel,
  LiquidityProviderBankAccountModel,
  LiquidityProviderBankAccountConfigModel,
  ActivityModel,
  ActivityStatusModel,
  OrderModel,
  PurchaseOrderModel,
  OrderStatusModel,
  OrderHelpdeskTicketModel,
  UserLevelModel,
  UserLevelLimitModel,
  SellOrderModel,
  KYCLevelModel,
  YieldOrderModel,
  OrderConfigurationModel,
  PurchaseOrderDetailsModel,
  UserSettingsModel,
  TransactionModel,
  TransactionStatusModel,
  ModernTreasuryWalletModel,
  UserSecretsModel,
  OrderStatusEntityService,
  SellOrderDetailsModel,
  UserRetentionModel,
  UserDetailsEntityService,
  PurchaseOrderFeesModel,
  SellOrderFeesModel,
  ReferralLevelModel,
  UserReferrerModel,
  AmbassadorLevelModel,
  UserAmbassadorModel,
  UserReferrerEntityService,
  RewardOrderModel,
  UserReferrerPayoutModel,
  UserKYCProviderVerificationModel,
  UserKYCProviderVerificationEntityService,
  UserBaNameMatchLogModel,
  TransferOrderModel,
  PromotionCampaignModel,
  UserCardHolderModel,
  UserCardModel,
  CardOrderModel,
  UserCardEntityService,
  UserCardHolderEntityService,
  OnChainOrderModel,
  FeatureWaitlistModel,
  TestPhoneNumberModel,
  CryptoAddressBlacklist,
  OnChainExchangeRateModel,
  OnChainOrderFeeModel,
  OnChainOrderEntityService,
} from '../models/db'

import { CurrentFireUserIdSymbol, CurrentFireUserSymbol, CurrentOrderSymbol, CurrentUserSymbol } from '../middleware'
import { CurrentTokenSymbol } from '../lib/middleware'

import {
  HardcodedVerificationService,
  IVerificationService,
  PrivateVerificationService,
  TwilioVerificationService,
  VerificationProvider,
  VerificationServiceSymbol,
} from '../services/verification'
import { HttpTransport, HttpTransportSymbol, IHttpTransport } from '@ts-awesome/request'
import {
  BranchIOConfigSymbol,
  BridgeCardConfigSymbol,
  FreshdeskConfigSymbol,
  IBranchIOConfig,
  IBridgeCardConfig,
  IFreshdeskConfig,
  IModernTreasuryConfig,
  IPaystackConfig,
  ISumsubConfig,
  IZendeskConfig,
  ModernTreasuryConfigSymbol,
  PaystackConfigSymbol,
  SumsubConfigSymbol,
  ZendeskConfigSymbol,
} from '../models/config'
import { BranchIOService, BranchIOServiceSymbol, IBranchIOService } from '../services/branch.service'
import { ExchangeRateModel } from '../models/db/exchange-rate.model'
import { ActivityService, ActivityServiceSymbol, IActivityService } from '../services/activity/activity.service'
import {
  IPurchaseOrderService,
  PurchaseOrderService,
  PurchaseOrderServiceSymbol,
} from '../services/purchase-order.service'
import { IFreshdeskService, FreshdeskService, FreshdeskServiceSymbol } from '../services/freshdesk.service'
import { IPOStatusService, POStatusService, POStatusServiceSymbol } from '../services/po-status.service'
import { ISellOrderService, SellOrderService, SellOrderServiceSymbol } from '../services/sell-order.service'
import { ISOStatusService, SOStatusService, SOStatusServiceSymbol } from '../services/so-status.service'
import {
  FreshDeskWebhookService,
  FreshDeskWebhookServiceSymbol,
  IFreshDeskWebhookService,
} from '../services/webhooks/freshdesk.webhook.service'
import { IYieldOrderService, YieldOrderService, YieldOrderServiceSymbol } from '../services/yield-order.service'
import { IWalletService, WalletService, WalletServiceSymbol } from '../services/wallet.service'
import { IYOStatusService, YOStatusService, YOStatusServiceSymbol } from '../services/yo-status.service'
import {
  UserBankAccountService,
  UserBankAccountServiceSymbol,
  IUserBankAccountService,
} from '../services/user-bank-account.service'
import { IPaystackService, PaystackService, PaystackServiceSymbol } from '../services/paystack.service'
import { IUserBalanceService, UserBalanceService, UserBalanceServiceSymbol } from '../services/user-balance.service'
import { IUserOrderService, UserOrderService, UserOrderServiceSymbol } from '../services/user-order.service'
import { IBankService, BankService, BankServiceSymbol } from '../services/bank.service'
import { IUserLevelService, UserLevelService, UserLevelServiceSymbol } from '../services/level/user-level.service'
import { IUserSecretsService, UserSecretsService, UserSecretsServiceSymbol } from '../services/user-secrets.service'
import { IUserSettingsService, UserSettingsService, UserSettingsServiceSymbol } from '../services/user-settings.service'
import { BcryptService, BcryptServiceSymbol, IBcryptService } from '../services/bcrypt.service'
import {
  IUserLevelLimitService,
  UserLevelLimitService,
  UserLevelLimitServiceSymbol,
} from '../services/user-level-limit.service'
import {
  IModernTreasuryService,
  ModernTreasuryService,
  ModernTreasuryServiceSymbol,
} from '../services/modern-treasury.service'
import {
  ITransactionService,
  TransactionService,
  TransactionServiceSymbol,
} from '../services/transaction/transaction.service'
import {
  ITransactionStatusService,
  TransactionStatusService,
  TransactionStatusServiceSymbol,
} from '../services/transaction/transaction-status.service'
import { IPinPayload, PinTokenService, PinTokenServiceSymbol } from '../services/token'
import { IPinCodeService, PinCodeService, PinCodeServiceSymbol } from '../services/pin-code.service'
import { AppLockService, AppLockServiceSymbol, IAppLockService } from '../services/app-lock.service'
import {
  FreshdeskConfigurationService,
  FreshdeskConfigurationServiceSymbol,
  IFreshdeskConfigurationService,
} from '../services/freshdesk-configuration.service'
import {
  ILiquidityProviderConfigurationService,
  LiquidityProviderConfigurationService,
  LiquidityProviderConfigurationServiceSymbol,
} from '../services/liquidity-provider-configuration.service'
import {
  ILPBankAccountAvailabilityService,
  LPBankAccountAvailabilityService,
  LPBankAccountAvailabilityServiceSymbol,
} from '../services/lp-bank-account-availability.service'
import { IYieldAprService, YieldAprService, YieldAprServiceSymbol } from '../services/yield-apr.service'
import { IOneTimePayload, OneTimeTokenService, OneTimeTokenServiceSymbol } from '../services/token'
import Newable = interfaces.Newable
import { IMailTemplateService, MailTemplateService, MailTemplateServiceSymbol } from '../services/mailer'
import { MailgunService } from '../services/mailer/mailgun.service'
import { UserPushModel } from '../models/db'
import { IPushService, PushService, PushServiceSymbol } from '../services/push.service'
import { ExchangeRateService, ExchangeRateServiceSymbol, IExchangeRateService } from '../services/exchange-rate.service'
import { FeeService, FeeServiceSymbol, IFeeService } from '../services/fee.service'
import {
  ILiquidityProviderService,
  LiquidityProviderService,
  LiquidityProviderServiceSymbol,
} from '../services/liquidity-provider.service'
import {
  IOrderConfigurationService,
  OrderConfigurationService,
  OrderConfigurationServiceSymbol,
} from '../services/order-configuration.service'
import {
  UserAccountManagementService,
  UserAccountManagementServiceSymbol,
  IUserAccountManagementService,
} from '../services/user-account-management.service'
import {
  IUserRetentionService,
  UserRetentionService,
  UserRetentionServiceSymbol,
} from '../services/user-retention.service'
import { IUserStatusService, UserStatusService, UserStatusServiceSymbol } from '../services/user-status.service'
import { ISupportService, SupportService, SupportServiceSymbol } from '../services/support.service'
import {
  FreshdeskSolutionsService,
  FreshdeskSolutionsServiceSymbol,
  IFreshdeskSolutionsService,
} from '../services/freshdesk-solutions.service'
import {
  IRewardOrderService,
  RewardOrderService,
  RewardOrderServiceSymbol,
} from '../services/reward/reward-order.service'
import { IROStatusService, ROStatusService, ROStatusServiceSymbol } from '../services/ro-status.service'
import {
  IUserReferrerService,
  UserReferrerService,
  UserReferrerServiceSymbol,
} from '../services/referrals/user-referrer.service'
import { AmbassadorService, AmbassadorServiceSymbol, IAmbassadorService } from '../services/ambassador.service'
import {
  ICashbackCalculator,
  CashbackCalculatorSymbol,
  CashbackCalculator,
} from '../services/cashback/cashback-calculator.service'
import { ICashbackService, CashbackSymbol, CashbackService } from '../services/cashback/cashback.service'
import {
  IPOCashbackCalculatorConfigService,
  POCashbackCalculatorConfigService,
  POCashbackCalculatorConfigServiceSymbol,
} from '../services/po-cashback-calculator-config.service'
import { POCashbackCalculatorConfigModel } from '../models/db/po-cashback-calculator-config.model'
import {
  ICashbackConfigService,
  CashbackConfigServiceSymbol,
  CashbackConfigService,
} from '../services/cashback/cashback-config.service'
import {
  IUserReferrerPayoutService,
  UserReferrerPayoutService,
  UserReferrerPayoutServiceSymbol,
} from '../services/referrals/user-referrer-payout.service'
import { IUsernameService, UsernameService, UsernameServiceSymbol } from '../services/username.service'
import {
  ISumsubWebhookService,
  SumsubWebhookService,
  SumsubWebhookServiceSymbol,
} from '../services/webhooks/sumsub.webhook.service'
import {
  IUserLevelInfoFactory,
  userLevelInfoFactory,
  UserLevelInfoFactorySymbol,
} from '../services/level/user-level-info.factory'
import { ISumsubService, SumsubService, SumsubServiceSymbol } from '../services/sumsub.service'
import {
  IUserKYCVerificationService,
  UserKYCVerificationService,
  UserKYCVerificationServiceSymbol,
} from '../services/kyc/user-kyc-verification.service'
import {
  IUserKYCLevelProcessor,
  KYCLevelProcessorType,
  UserKYCLevelProcessorFactorySymbol,
} from '../services/kyc/kyc-level-processor'
import { UserKYCLevel2Processor } from '../services/kyc/kyc-level-2-processor'
import {
  IUserFullNameService,
  UserFullNameService,
  UserFullNameServiceSymbol,
} from '../services/user-full-name.service'
import { IUserLimitService, UserLimitService, UserLimitServiceSymbol } from '../services/user-limit.service'
import {
  ITransferOrderService,
  TransferOrderService,
  TransferOrderServiceSymbol,
} from '../services/transfer-order.service'
import { ITOStatusService, TOStatusService, TOStatusServiceSymbol } from '../services/to-status.service'
import {
  FirestoreActivityService,
  FirestoreActivityServiceSymbol,
  IFirestoreActivityService,
} from '../services/activity/firestore-activity.service'
import {
  ITOActivityService,
  TOActivityService,
  TOActivityServiceSymbol,
} from '../services/activity/to-activity.service'
import {
  IUserBaNameMatchLogService,
  UserBaNameMatchLogService,
  UserBaNameMatchLogServiceSymbol,
} from '../services/bank-account/user-ba-name-match-log.service'
import {
  IPromotionCampaignService,
  PromotionCampaignService,
  PromotionCampaignServiceSymbol,
} from '../services/promotion-campaign.service'
import {
  createRewardNotificationFactory,
  RewardNotificationFactorySymbol,
} from '../services/reward/notifications/reward-notification.factory'
import {
  IMoneyTransferService,
  MoneyTransferService,
  MoneyTransferServiceSymbol,
} from '../services/money-transfer.service'
import {
  BridgeCardService,
  BridgeCardServiceSymbol,
  IBridgeCardService,
} from '../services/dumb/card/bridgecard.service'
import { CardService, CardServiceSymbol, ICardService } from '../services/dumb/card/card.service'
import {
  IReceiveMoneyBusinessService,
  ReceiveMoneyBusinessService,
  ReceiveMoneyBusinessServiceSymbol,
} from '../services/business/receive/receive-money.business.service'
import {
  IVirtualCardBusinessService,
  VirtualCardBusinessService,
  VirtualCardBusinessServiceSymbol,
} from '../services/business/card/virtual-card.business.service'
import {
  BridgeCardWebhookService,
  BridgeCardWebhookServiceSymbol,
  IBridgeCardWebhookService,
} from '../services/webhooks/bridgecard.webhook.service'
import { BitGoConfigSymbol, IBitGoConfig } from '../models/config'
import { UserCryptoWalletEntityService, UserCryptoWalletModel } from '../models/db/user-crypto-wallet.model'
import {
  IOnChainBusinessService,
  OnChainBusinessService,
  OnChainBusinessServiceSymbol,
} from '../services/business/on-chain/on-chain.business.service'
import {
  BitGoWebhookService,
  BitGoWebhookServiceSymbol,
  IBitGoWebhookService,
} from '../services/webhooks/bitgo.webhook.service'
import { BitGoService, BitGoServiceSymbol, IBitGoService } from '../services/dumb/on-chain/bitgo.service'
import { IOnChainService, OnChainService, OnChainServiceSymbol } from '../services/dumb/on-chain/on-chain.service'
import {
  IOnChainOrderService,
  OnChainOrderService,
  OnChainOrderServiceSymbol,
} from '../services/dumb/on-chain/order/on-chain-order.service'
import {
  IOCOStatusService,
  OcoStatusService,
  OCOStatusServiceSymbol,
} from '../services/dumb/on-chain/order/oco-status.service'
import {
  ITransactionServiceV2,
  TransactionServiceV2,
  TransactionServiceV2Symbol,
} from '../services/dumb/transaction/transaction.service.v2'
import {
  ITransactionStatusServiceV2,
  TransactionStatusServiceV2,
  TransactionStatusServiceV2Symbol,
} from '../services/dumb/transaction/transaction-status.service.v2'
import { IdentityService, IdentityServiceSymbol, IIdentityService } from '../services/dumb/identity/identity.service'
import {
  CardOrderService,
  CardOrderServiceSymbol,
  ICardOrderService,
} from '../services/dumb/card/card-order/card-order.service'
import {
  CardOrderStatusService,
  CardOrderStatusServiceSymbol,
  ICardOrderStatusService,
} from '../services/dumb/card/card-order/co-status.service'
import {
  COActivityService,
  COActivityServiceSymbol,
  ICOActivityService,
} from '../services/dumb/card/card-activity/co-activity.service'
import {
  CardNotificationService,
  CardNotificationServiceSymbol,
  ICardNotificationService,
} from '../services/dumb/card/notifications/card-notification.service'
import { UserFreshchatModel } from '../models/db/user-freshchat.model'

import {
  BankManagementService,
  BankManagementServiceSymbol,
  IBankManagementService,
} from '../services/dumb/bank/bank-management.service'
import {
  IWaitlistBusinessService,
  WaitlistBusinessService,
  WaitlistBusinessServiceSymbol,
} from '../services/business/waitlist/waitlist.business.service'
import {
  IOCOActivityService,
  OCOActivityService,
  OCOActivityServiceSymbol,
} from '../services/dumb/on-chain/activity/oco-activity.service'
import {
  IOnChainNotificationService,
  OnChainNotificationService,
  OnChainNotificationServiceSymbol,
} from '../services/dumb/on-chain/notification/on-chain-notification.service'
import {
  IOnChainExchangeRateService,
  OnChainExchangeRateService,
  OnChainExchangeRateServiceSymbol,
} from '../services/dumb/on-chain/on-chain-exchange-rate.service'

export function setupRequestContainer(container: Container): void {
  // TBD: Switch off the profiling
  // if (container.isBound(ProfilingSessionSymbol)) {
  //   container.unbind(ProfilingSessionSymbol)
  // }

  container
    .bind<IUnitOfWork<ISqlQuery>>(EntitySymbols.UnitOfWork)
    .toDynamicValue(({ container }) => {
      const driver = container.get<IQueryDriver<ISqlQuery>>(OrmSymbols.SqlQueryDriver)
      return new UnitOfWork<ISqlQuery>(driver)
    })
    .inSingletonScope()

  bindEntityServices(
    container,
    //
    UserModel,
    EmailVerificationModel,
    InvitationModel,
    UserReferrerRegistrationModel,
    MaxApprovedUsersModel,
    ExchangeRateModel,
    WalletModel,
    UserWalletModel,
    WalletBalanceModel,
    FeeModel,
    BankModel,
    BankConfigModel,
    UserBankAccountModel,
    UserBankAccountConfigModel,
    LiquidityProviderModel,
    LiquidityProviderConfigModel,
    LiquidityProviderBankAccountModel,
    LiquidityProviderBankAccountConfigModel,
    OrderModel,
    PurchaseOrderModel,
    POCashbackCalculatorConfigModel,
    OrderHelpdeskTicketModel,
    ActivityModel,
    ActivityStatusModel,
    UserLevelModel,
    UserLevelLimitModel,
    SellOrderModel,
    YieldOrderModel,
    KYCLevelModel,
    OrderConfigurationModel,
    PurchaseOrderDetailsModel,
    UserSettingsModel,
    TransactionModel,
    TransactionStatusModel,
    ModernTreasuryWalletModel,
    UserSecretsModel,
    SellOrderDetailsModel,
    UserPushModel,
    UserRetentionModel,
    PurchaseOrderFeesModel,
    SellOrderFeesModel,
    RewardOrderModel,
    ReferralLevelModel,
    AmbassadorLevelModel,
    UserAmbassadorModel,
    UserReferrerPayoutModel,
    UserBaNameMatchLogModel,
    TransferOrderModel,
    PromotionCampaignModel,
    CardOrderModel,
    UserFreshchatModel,
    FeatureWaitlistModel,
    TestPhoneNumberModel,
    CryptoAddressBlacklist,
    OnChainExchangeRateModel,
    OnChainOrderFeeModel,
  )
  bindCustomEntityService(container, OrderStatusModel, OrderStatusEntityService)
  bindCustomEntityService(container, UserDetailsModel, UserDetailsEntityService)
  bindCustomEntityService(container, UserReferrerModel, UserReferrerEntityService)
  bindCustomEntityService(container, UserKYCProviderVerificationModel, UserKYCProviderVerificationEntityService)
  bindCustomEntityService(container, UserCardModel, UserCardEntityService)
  bindCustomEntityService(container, UserCardHolderModel, UserCardHolderEntityService)
  bindCustomEntityService(container, UserCryptoWalletModel, UserCryptoWalletEntityService)
  bindCustomEntityService(container, OnChainOrderModel, OnChainOrderEntityService)

  // token
  container.bind<ITokenService<IClaims>>(AuthTokenServiceSymbol).to(AuthTokenService)
  container.bind<ITokenService<IConfirmPayload>>(ConfirmTokenServiceSymbol).to(ConfirmTokenService)
  container.bind<ITokenService<IPinPayload>>(PinTokenServiceSymbol).to(PinTokenService)
  container.bind<ITokenService<IOneTimePayload>>(OneTimeTokenServiceSymbol).to(OneTimeTokenService)

  // other
  container.bind<IUserService>(UserServiceSymbol).to(UserService)
  container.bind<IMailerService>(MailerServiceSymbol).toDynamicValue(({ container }) => {
    const provider = container.get<IConfig>(ConfigSymbol).get<MailerProvider>('mailerProvider')

    switch (provider) {
      case MailerProvider.Mailgun:
        return container.resolve(MailgunService)
      case MailerProvider.Console:
      default:
        return container.resolve(ConsoleMailerService)
    }
  })
  container.bind<ISMSService>(SMSServiceSymbol).toDynamicValue(() => {
    const config = container.get<IConfig>(ConfigSymbol)
    const smsMode = config.get<SMSProvider>('smsProvider')

    switch (smsMode) {
      case SMSProvider.Twilio:
        return container.resolve(TwilioService)
      default:
        return new ConsoleSMSService()
    }
  })
  container.bind<IVerificationService>(VerificationServiceSymbol).toDynamicValue(() => {
    const config = container.get<IConfig>(ConfigSymbol)
    const mode = config.get<VerificationProvider>('verificationProvider')

    switch (mode) {
      case VerificationProvider.Twilio:
        return container.resolve(TwilioVerificationService)
      case VerificationProvider.Hardcoded:
        return container.resolve(HardcodedVerificationService)
      default:
        return container.resolve(PrivateVerificationService)
    }
  })
  container.bind<IBranchIOService>(BranchIOServiceSymbol).to(BranchIOService)
  container.bind<IActivityService>(ActivityServiceSymbol).to(ActivityService)
  container.bind<IPurchaseOrderService>(PurchaseOrderServiceSymbol).to(PurchaseOrderService)
  container.bind<IFreshdeskService>(FreshdeskServiceSymbol).to(FreshdeskService)
  container.bind<IPOStatusService>(POStatusServiceSymbol).to(POStatusService)
  container.bind<ISellOrderService>(SellOrderServiceSymbol).to(SellOrderService)
  container.bind<ISOStatusService>(SOStatusServiceSymbol).to(SOStatusService)
  container.bind<ITransactionService>(TransactionServiceSymbol).to(TransactionService)
  container.bind<ITransactionStatusService>(TransactionStatusServiceSymbol).to(TransactionStatusService)

  container.bind<IYieldOrderService>(YieldOrderServiceSymbol).to(YieldOrderService)
  container.bind<IYOStatusService>(YOStatusServiceSymbol).to(YOStatusService)
  container.bind<IWalletService>(WalletServiceSymbol).to(WalletService)
  container.bind<IUserBankAccountService>(UserBankAccountServiceSymbol).to(UserBankAccountService)
  container.bind<IPaystackService>(PaystackServiceSymbol).to(PaystackService)
  container.bind<IUserBalanceService>(UserBalanceServiceSymbol).to(UserBalanceService)
  container.bind<IUserOrderService>(UserOrderServiceSymbol).to(UserOrderService)
  container.bind<IBankService>(BankServiceSymbol).to(BankService)
  container.bind<IUserSecretsService>(UserSecretsServiceSymbol).to(UserSecretsService)
  container.bind<IUserSettingsService>(UserSettingsServiceSymbol).to(UserSettingsService)
  container.bind<IBcryptService>(BcryptServiceSymbol).to(BcryptService)

  container.bind<IUserLevelService>(UserLevelServiceSymbol).to(UserLevelService)
  container.bind<IUserLevelLimitService>(UserLevelLimitServiceSymbol).to(UserLevelLimitService)
  container.bind<IUserLevelInfoFactory>(UserLevelInfoFactorySymbol).toFactory(userLevelInfoFactory)

  container.bind<IModernTreasuryService>(ModernTreasuryServiceSymbol).to(ModernTreasuryService)
  container.bind<IPinCodeService>(PinCodeServiceSymbol).to(PinCodeService)
  container.bind<IAppLockService>(AppLockServiceSymbol).to(AppLockService)
  container
    .bind<ILiquidityProviderConfigurationService>(LiquidityProviderConfigurationServiceSymbol)
    .to(LiquidityProviderConfigurationService)
  container.bind<IFreshdeskConfigurationService>(FreshdeskConfigurationServiceSymbol).to(FreshdeskConfigurationService)
  container
    .bind<ILPBankAccountAvailabilityService>(LPBankAccountAvailabilityServiceSymbol)
    .to(LPBankAccountAvailabilityService)
  container.bind<IYieldAprService>(YieldAprServiceSymbol).to(YieldAprService)
  container.bind<IMailTemplateService>(MailTemplateServiceSymbol).to(MailTemplateService)
  container.bind<IUserAccountManagementService>(UserAccountManagementServiceSymbol).to(UserAccountManagementService)
  container.bind<IUserRetentionService>(UserRetentionServiceSymbol).to(UserRetentionService)
  container.bind<IUserStatusService>(UserStatusServiceSymbol).to(UserStatusService)
  container.bind<IPushService>(PushServiceSymbol).to(PushService)
  container.bind<ISupportService>(SupportServiceSymbol).to(SupportService)
  container.bind<IFreshdeskSolutionsService>(FreshdeskSolutionsServiceSymbol).to(FreshdeskSolutionsService)
  container.bind<IRewardOrderService>(RewardOrderServiceSymbol).to(RewardOrderService)
  container.bind<IROStatusService>(ROStatusServiceSymbol).to(ROStatusService)
  container.bind<IUserReferrerService>(UserReferrerServiceSymbol).to(UserReferrerService)
  container.bind<ICashbackCalculator>(CashbackCalculatorSymbol).to(CashbackCalculator)
  container.bind<ICashbackService>(CashbackSymbol).to(CashbackService)
  container.bind<ICashbackConfigService>(CashbackConfigServiceSymbol).to(CashbackConfigService)
  container
    .bind<IPOCashbackCalculatorConfigService>(POCashbackCalculatorConfigServiceSymbol)
    .to(POCashbackCalculatorConfigService)
  container.bind<IAmbassadorService>(AmbassadorServiceSymbol).to(AmbassadorService)
  container.bind<IUserReferrerPayoutService>(UserReferrerPayoutServiceSymbol).to(UserReferrerPayoutService)
  container.bind<IUsernameService>(UsernameServiceSymbol).to(UsernameService)
  container.bind<ISumsubService>(SumsubServiceSymbol).to(SumsubService)

  container.bind<IUserKYCVerificationService>(UserKYCVerificationServiceSymbol).to(UserKYCVerificationService)
  container
    .bind<IUserKYCLevelProcessor>(UserKYCLevelProcessorFactorySymbol)
    .toFactory(() => (kycLevelProcessor: KYCLevelProcessorType) => {
      switch (kycLevelProcessor) {
        case KYCLevelProcessorType.KYCLevel2:
          return container.resolve(UserKYCLevel2Processor)
        default:
          return null
      }
    })
  container.bind<IUserFullNameService>(UserFullNameServiceSymbol).to(UserFullNameService)
  container.bind<IUserLimitService>(UserLimitServiceSymbol).to(UserLimitService)
  container.bind<ITransferOrderService>(TransferOrderServiceSymbol).to(TransferOrderService)
  container.bind<ITOStatusService>(TOStatusServiceSymbol).to(TOStatusService)
  container.bind<IUserBaNameMatchLogService>(UserBaNameMatchLogServiceSymbol).to(UserBaNameMatchLogService)
  container.bind<IPromotionCampaignService>(PromotionCampaignServiceSymbol).to(PromotionCampaignService)
  container.bind<IMoneyTransferService>(MoneyTransferServiceSymbol).to(MoneyTransferService)
  container.bind<IBridgeCardService>(BridgeCardServiceSymbol).to(BridgeCardService)
  container.bind<ICardService>(CardServiceSymbol).to(CardService)

  container.bind<IFirestoreActivityService>(FirestoreActivityServiceSymbol).to(FirestoreActivityService)
  container.bind<ITOActivityService>(TOActivityServiceSymbol).to(TOActivityService)
  container.bind(RewardNotificationFactorySymbol).toFactory(createRewardNotificationFactory)
  container.bind<ITransactionServiceV2>(TransactionServiceV2Symbol).to(TransactionServiceV2)
  container.bind<ITransactionStatusServiceV2>(TransactionStatusServiceV2Symbol).to(TransactionStatusServiceV2)
  container.bind<IIdentityService>(IdentityServiceSymbol).to(IdentityService)

  container.bind<ICardOrderService>(CardOrderServiceSymbol).to(CardOrderService)
  container.bind<ICardOrderStatusService>(CardOrderStatusServiceSymbol).to(CardOrderStatusService)
  container.bind<ICOActivityService>(COActivityServiceSymbol).to(COActivityService)
  container.bind<ICardNotificationService>(CardNotificationServiceSymbol).to(CardNotificationService)

  container.bind<IBankManagementService>(BankManagementServiceSymbol).to(BankManagementService)

  container.bind<IBitGoService>(BitGoServiceSymbol).to(BitGoService)
  container.bind<IOnChainService>(OnChainServiceSymbol).to(OnChainService)
  container.bind<IOnChainOrderService>(OnChainOrderServiceSymbol).to(OnChainOrderService)
  container.bind<IOCOStatusService>(OCOStatusServiceSymbol).to(OcoStatusService)
  container.bind<IOCOActivityService>(OCOActivityServiceSymbol).to(OCOActivityService)
  container.bind<IOnChainNotificationService>(OnChainNotificationServiceSymbol).to(OnChainNotificationService)
  container.bind<IOnChainExchangeRateService>(OnChainExchangeRateServiceSymbol).to(OnChainExchangeRateService)

  // webhooks services
  container.bind<IFreshDeskWebhookService>(FreshDeskWebhookServiceSymbol).to(FreshDeskWebhookService)
  container.bind<ISumsubWebhookService>(SumsubWebhookServiceSymbol).to(SumsubWebhookService)
  container.bind<IBitGoWebhookService>(BitGoWebhookServiceSymbol).to(BitGoWebhookService)
  container.bind<IBridgeCardWebhookService>(BridgeCardWebhookServiceSymbol).to(BridgeCardWebhookService)

  // business services
  // all high level business/domain services should go here
  container.bind<IReceiveMoneyBusinessService>(ReceiveMoneyBusinessServiceSymbol).to(ReceiveMoneyBusinessService)
  container.bind<IVirtualCardBusinessService>(VirtualCardBusinessServiceSymbol).to(VirtualCardBusinessService)
  container.bind<IOnChainBusinessService>(OnChainBusinessServiceSymbol).to(OnChainBusinessService)
  container.bind<IWaitlistBusinessService>(WaitlistBusinessServiceSymbol).to(WaitlistBusinessService)

  // moved from root scope
  container.bind<IExchangeRateService>(ExchangeRateServiceSymbol).to(ExchangeRateService).inSingletonScope()
  container.bind<IFeeService>(FeeServiceSymbol).to(FeeService).inSingletonScope()
  container
    .bind<ILiquidityProviderService>(LiquidityProviderServiceSymbol)
    .to(LiquidityProviderService)
    .inSingletonScope()
  container
    .bind<IOrderConfigurationService>(OrderConfigurationServiceSymbol)
    .to(OrderConfigurationService)
    .inSingletonScope()

  // middleware models
  container.bind<UserModel | null>(CurrentUserSymbol).toConstantValue(null)
  container.bind<OrderModel | null>(CurrentOrderSymbol).toConstantValue(null)
  container.bind<fbAdmin.auth.UserRecord | null>(CurrentFireUserSymbol).toConstantValue(null)
  container.bind<string | null>(CurrentTokenSymbol).toConstantValue(null)
  container.bind<string | null>(CurrentFireUserIdSymbol).toConstantValue(null)

  container
    .bind<IHttpTransport>(HttpTransportSymbol)
    .toDynamicValue(() => {
      const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
      const logger = loggerFactory(HttpTransport)
      const zendesk = container.get<IZendeskConfig>(ZendeskConfigSymbol)

      return new HttpTransport(logger, zendesk.baseUrl, () => {
        const token = Buffer.from(zendesk.credentials).toString('base64')
        return `Basic ${token}`
      })
    })
    .whenTargetNamed('zendesk')
  container
    .bind<IHttpTransport>(HttpTransportSymbol)
    .toDynamicValue(() => {
      // const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
      // const logger = loggerFactory(HttpTransport)

      const loggerDriver = container.get<ILoggerDriver>(LoggerDriverSymbol)
      const logger = new Logger(HttpTransport.name, (level, prefix, message, dataMethod, dataUrl, __skipHeaders) => {
        // headers is the 3d param so we should not pass it down
        loggerDriver(level, prefix, message, dataMethod, dataUrl)
      })
      const branchIOConfig = container.get<IBranchIOConfig>(BranchIOConfigSymbol)

      return new HttpTransport(logger, branchIOConfig.url)
    })
    .whenTargetNamed('branchio')
  container
    .bind<IHttpTransport>(HttpTransportSymbol)
    .toDynamicValue(() => {
      // const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
      // const logger = loggerFactory(HttpTransport)

      const loggerDriver = container.get<ILoggerDriver>(LoggerDriverSymbol)
      const logger = new Logger(HttpTransport.name, (level, prefix, message, dataMethod, dataUrl, __skipHeaders) => {
        // headers is the 3d param so we should not pass it down
        loggerDriver(level, prefix, message, dataMethod, dataUrl)
      })
      const paystackConfig = container.get<IPaystackConfig>(PaystackConfigSymbol)

      return new HttpTransport(logger, paystackConfig.url, () => `Bearer ${paystackConfig.key}`)
    })
    .whenTargetNamed('paystack')
  container
    .bind<IHttpTransport>(HttpTransportSymbol)
    .toDynamicValue(() => {
      // const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
      // const logger = loggerFactory(HttpTransport)
      const loggerDriver = container.get<ILoggerDriver>(LoggerDriverSymbol)
      const logger = new Logger(HttpTransport.name, (level, prefix, message, dataMethod, dataUrl, __skipHeaders) => {
        // headers is the 3d param so we should not pass it down
        loggerDriver(level, prefix, message, dataMethod, dataUrl)
      })

      const config = container.get<IModernTreasuryConfig>(ModernTreasuryConfigSymbol)
      const basicAuth = Buffer.from(`${config.organizationId}:${config.key}`).toString('base64')

      return new HttpTransport(logger, config.url, () => `Basic ${basicAuth}`)
    })
    .whenTargetNamed('modern-treasury')
  container
    .bind<IHttpTransport>(HttpTransportSymbol)
    .toDynamicValue(() => {
      // const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
      // const logger = loggerFactory(HttpTransport)
      const loggerDriver = container.get<ILoggerDriver>(LoggerDriverSymbol)
      const logger = new Logger(HttpTransport.name, (level, prefix, message, dataMethod, dataUrl, __skipHeaders) => {
        // headers is the 3d param so we should not pass it down
        loggerDriver(level, prefix, message, dataMethod, dataUrl)
      })

      const config = container.get<IFreshdeskConfig>(FreshdeskConfigSymbol)
      const url = config.url.startsWith('http') ? config.url : `https://${config.url}`
      const basicAuth = Buffer.from(`${config.key}:X`).toString('base64')

      return new HttpTransport(logger, url, () => `Basic ${basicAuth}`)
    })
    .whenTargetNamed('freshdesk')
  container
    .bind<IHttpTransport>(HttpTransportSymbol)
    .toDynamicValue(() => {
      // const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
      // const logger = loggerFactory(HttpTransport)
      const loggerDriver = container.get<ILoggerDriver>(LoggerDriverSymbol)
      const logger = new Logger(HttpTransport.name, (level, prefix, message, dataMethod, dataUrl, __skipHeaders) => {
        // headers is the 3d param so we should not pass it down
        loggerDriver(level, prefix, message, dataMethod, dataUrl)
      })

      const config = container.get<ISumsubConfig>(SumsubConfigSymbol)
      const url = config.apiUrl.startsWith('http') ? config.apiUrl : `https://${config.apiUrl}`

      return new HttpTransport(logger, url)
    })
    .whenTargetNamed('sumsub')
  container
    .bind<IHttpTransport>(HttpTransportSymbol)
    .toDynamicValue(() => {
      // const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
      // const logger = loggerFactory(HttpTransport)
      const loggerDriver = container.get<ILoggerDriver>(LoggerDriverSymbol)
      const logger = new Logger(HttpTransport.name, (level, prefix, message, dataMethod, dataUrl, __skipHeaders) => {
        // headers is the 3d param so we should not pass it down
        loggerDriver(level, prefix, message, dataMethod, dataUrl)
      })

      const config = container.get<IBridgeCardConfig>(BridgeCardConfigSymbol)
      const url = config.apiUrl.startsWith('http') ? config.apiUrl : `https://${config.apiUrl}`

      return new HttpTransport(logger, url)
    })
    .whenTargetNamed('bridgecard')
  container
    .bind<IHttpTransport>(HttpTransportSymbol)
    .toDynamicValue(() => {
      // const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
      // const logger = loggerFactory(HttpTransport)
      const loggerDriver = container.get<ILoggerDriver>(LoggerDriverSymbol)
      const logger = new Logger(HttpTransport.name, (level, prefix, message, dataMethod, dataUrl, __skipHeaders) => {
        // headers is the 3d param so we should not pass it down
        loggerDriver(level, prefix, message, dataMethod, dataUrl)
      })

      const config = container.get<IBitGoConfig>(BitGoConfigSymbol)

      const url = config.apiUrl.startsWith('http') ? config.apiUrl : `https://${config.apiUrl}`
      const token = config.apiToken

      return new HttpTransport(logger, url, `Bearer ${token}`)
    })
    .whenTargetNamed('bitgo')
  container
    .bind<IHttpTransport>(HttpTransportSymbol)
    .toDynamicValue(() => {
      // const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
      // const logger = loggerFactory(HttpTransport)
      const loggerDriver = container.get<ILoggerDriver>(LoggerDriverSymbol)
      const logger = new Logger(HttpTransport.name, (level, prefix, message, dataMethod, dataUrl, __skipHeaders) => {
        // headers is the 3d param so we should not pass it down
        loggerDriver(level, prefix, message, dataMethod, dataUrl)
      })

      const config = container.get<IBridgeCardConfig>(BridgeCardConfigSymbol)
      const url = config.apiVaultUrl.startsWith('http') ? config.apiVaultUrl : `https://${config.apiVaultUrl}`

      return new HttpTransport(logger, url)
    })
    .whenTargetNamed('bridgecard-vault')
}

function bindEntityServices(container: Container, ...DBModels: TableMetaProvider[]): void {
  for (const DBModel of DBModels) {
    const executorProvider = container.get<IQueryExecutorProvider<ISqlQuery>>(EntitySymbols.UnitOfWork)
    const queryBuilder = container.get<IBuildableQueryCompiler<ISqlQuery>>(OrmSymbols.SqlQueryBuilder)

    container
      .bind<IEntityService<unknown, never, never, never>>(EntitySymbols.serviceFor(DBModel))
      .toConstantValue(new EntityService(DBModel, executorProvider, queryBuilder))
  }
}
function bindCustomEntityService<T>(
  container: Container,
  Model: TableMetaProvider<T>,
  Service: Newable<EntityService<T, any, any, any, any>>,
) {
  const executorProvider = container.get<IQueryExecutorProvider<ISqlQuery>>(EntitySymbols.UnitOfWork)
  const queryBuilder = container.get<IBuildableQueryCompiler<ISqlQuery>>(OrmSymbols.SqlQueryBuilder)

  container
    .bind<IEntityService<unknown, never, never, never>>(EntitySymbols.serviceFor(Model))
    .toConstantValue(new Service(Model, executorProvider, queryBuilder))
}

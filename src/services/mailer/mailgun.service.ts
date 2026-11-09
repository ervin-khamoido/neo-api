2021

import { injectable, inject } from 'inversify'
import { LoggerFactorySymbol, ILoggerFactory, ILogger } from '@ts-awesome/logger'

import formData from 'form-data'

import Mailgun from 'mailgun.js'
import { IMailgunClient } from 'mailgun.js/Interfaces'
import { IMessage, IMailerService } from '../../lib/services/mailer'

import { IMailgunConfig, MailgunConfigSymbol } from '../../lib/models/config'

import { IMailTemplateService, MailTemplateServiceSymbol } from './mail-template.service'
import { ISupportConfig, SupportConfigSymbol } from '../../models/config'

const mailgun = new Mailgun(formData)

// NOTE: The value should match the template file name
export enum MailTemplates {
  Invitation = 'invitation',
  PinReset = 'pin-reset',
  VerificationCode = 'verification-code',
  NewAccount = 'new-account',
  RefundComplete = 'refund-complete',
  WithdrawComplete = 'withdraw-complete',
  YieldReminder = 'yield-reminder',
  CashbackBuy = 'reward-cashback-buy',
  ReferralReferrer = 'reward-referral-referrer',
  AccountBlocked = 'account-blocked',

  SendReceive_MoneySentOffChain = 'send-receive-money-sent-off-chain',
  SendReceive_MoneyReceivedOffChain = 'send-receive-money-received-off-chain',
  SendReceive_MoneyReceivedOnChain = 'send-receive-money-receive-on-chain',

  PromotionCampaignDefault = 'reward-promotion-campaign-default',

  CardSpendSuccessful = 'card-spend-successful',
  CardTopUpSuccessful = 'card-top-up-successful',
}

@injectable()
export class MailgunService implements IMailerService {
  private service: IMailgunClient // Mailgun
  private readonly logger: ILogger

  @inject(MailTemplateServiceSymbol) mailTemplateService!: IMailTemplateService

  constructor(
    @inject(MailgunConfigSymbol) private config: IMailgunConfig,
    @inject(SupportConfigSymbol) private supportConfig: ISupportConfig,
    @inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory,
  ) {
    this.service = mailgun.client({ username: 'api', key: config.apiKey, url: config.sendingUrl })
    this.logger = loggerFactory(MailgunService)
  }

  public async send(payload: IMessage): Promise<void> {
    const { sendingDomain, from } = this.config

    // Add generic data for email (ex: support email, year, etc.)
    if (!payload.template.variables?.support_email) {
      payload.template.variables.support_email = this.supportConfig.email
    }

    try {
      // Get the formatted html
      const formattedHtml = await this.mailTemplateService.generateFormattedHtml(payload.template)

      await this.service.messages.create(sendingDomain, {
        from: from,
        to: payload.to,
        subject: payload.subject,
        html: formattedHtml,
      })
    } catch (err: any) {
      this.logger.error(err)
      this.logger.error(err?.details?.message ?? 'Unexpected error')
    }
  }
}

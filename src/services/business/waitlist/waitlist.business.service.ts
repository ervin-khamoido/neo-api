import { inject, injectable } from 'inversify'
import { firestore } from 'firebase-admin'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  FeatureWaitlistEntityServiceSymbol,
  FeatureWaitlistUserFeatureUniqueIndex,
  IFeatureWaitlistEntityService,
  IUserEntityService,
  UserEntityServiceSymbol,
} from '../../../models/db'

import { IPushService, PushServiceSymbol } from '../../push.service'

export interface IWaitlistBusinessService {
  /**
   * Switch the feature for the user in waitlist on/off.
   *
   * @param userId the user's ID for whom the feature has to be switched on/off
   * @param feature the feature name
   * @param value if true then the feature is switched on, otherwise switched off
   */
  switchFeatureForUserInWaitlist(userId: number, feature: WaitlistFeature, value: boolean): Promise<void>

  /**
   * Adds the user to the feature's waitlist.
   *
   * @param userId the user's ID
   * @param feature the feature name
   */
  addUserToWaitlist(userId: number, feature: WaitlistFeature): Promise<void>
}

export const WaitlistBusinessServiceSymbol = Symbol.for('IWaitlistBusinessService')

@injectable()
export class WaitlistBusinessService implements IWaitlistBusinessService {
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService
  @inject(FeatureWaitlistEntityServiceSymbol) featureWaitlistService!: IFeatureWaitlistEntityService
  @inject(PushServiceSymbol) pushService!: IPushService

  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(WaitlistBusinessService)
  }

  async switchFeatureForUserInWaitlist(userId: number, feature: WaitlistFeature, value: boolean): Promise<void> {
    await this.featureWaitlistService.updateOne({
      userId: userId,
      feature: feature,
      enabled: value,
    })

    await this.notifyWishlistUpdate(userId)

    if (value) {
      await this.pushService.scheduleSend({
        userId: userId,
        payload: {
          version: 'v1',
          title: `Waitlist: ${WaitlistFeatureName[feature]}`,
          body:
            `Congratulations, you've been approved for the Neobank App ` +
            `${WaitlistFeatureName[feature].toLowerCase()}. Welcome aboard  🎉`,
        },
        reason: 'waitlist:feature:on',
      })
    }
  }

  async addUserToWaitlist(userId: number, feature: WaitlistFeature): Promise<void> {
    await this.featureWaitlistService.upsertOne(
      {
        userId: userId,
        feature: feature,
        enabled: false,
      },
      FeatureWaitlistUserFeatureUniqueIndex,
    )

    await this.pushService.scheduleSend({
      userId: userId,
      payload: {
        version: 'v1',
        title: `Waitlist: ${WaitlistFeatureName[feature]}`,
        body: `Thank you for signing up for the Neobank App ${WaitlistFeatureName[feature].toLowerCase()}.`,
      },
      reason: 'waitlist:sign-up',
    })
  }

  private async notifyWishlistUpdate(userId: number): Promise<void> {
    try {
      const user = await this.userEntityService.getOne({ id: userId })
      if (!user) {
        this.logger.error(`notifyWishlistUpdate(): user with a userId ${userId} is not found`)
        return
      }

      const increment = firestore.FieldValue.increment(1)
      await firestore()
        .collection('user')
        .doc(user.fireUserId)
        .set({ waitlist: { version: increment } }, { merge: true })
    } catch (err: any) {
      this.logger.error(`critical: notify user about card update failed`)
      this.logger.error(err)
    }
  }
}

export enum WaitlistFeature {
  VirtualCard = 'virtual_card',
  OnChain_Receive = 'on_chain_receive',
  OnChain_Send = 'on_chain_send',
}

const WaitlistFeatureName = Object.freeze({
  [WaitlistFeature.VirtualCard]: 'Virtual Card',
  [WaitlistFeature.OnChain_Receive]: 'Receive On-Chain',
  [WaitlistFeature.OnChain_Send]: 'Send On-Chain',
})

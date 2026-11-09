export interface IRewardNotificationService {
  notifyViaEmail(rewardOrderId: number): Promise<void>
  notifyViaPush(rewardOrderId: number): Promise<void>
}

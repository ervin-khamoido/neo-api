import { readable } from '@ts-awesome/model-reader'

interface IPushRewardData {
  type: 'order.reward'
  version: 'v1'
  order: string // Order UID
}

// interface IPushExampleData {
//   reason: 'example.next_level'
//   version: 'v123'
//   fooBar: number
// }

export interface IPushPayloadV1 {
  version: 'v1'
  title: string
  body: string
}

export type PushPayload = IPushPayloadV1
export type PushData = IPushRewardData // IPushRewardData | IPushExampleData

export class PushEventData {
  @readable userId!: number
  @readable reason!: string
  @readable(Boolean, true) showOnForeground?: boolean

  @readable(Object) payload!: PushPayload
  @readable(Object, true) data?: PushData
}

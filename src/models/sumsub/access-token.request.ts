2021

import { readable } from '@ts-awesome/model-reader'

export class AccessTokenRequest {
  @readable(String) userId!: string // User ID here should be our internal User UID
  @readable(String) levelName!: string
  @readable(String, true) externalActionId?: string | null
  @readable(Number, true) ttlInSecs?: number | null
}

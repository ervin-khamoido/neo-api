2021

import { readable } from '@ts-awesome/model-reader'

export class AccessTokenResponse {
  @readable(String) token!: string
  @readable(String) userId!: string
}

2021

import { readable } from '@ts-awesome/model-reader'

export class UserSearchInfo {
  @readable uid!: string
  @readable('first_name', String, true) firstName?: string | null
  @readable('last_name', String, true) lastName?: string | null
  @readable(String, true) username?: string | null
}

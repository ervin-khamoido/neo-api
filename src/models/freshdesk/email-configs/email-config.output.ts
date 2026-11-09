import { readable } from '@ts-awesome/model-reader'

export class EmailConfigOutput {
  @readable id!: number
  @readable name!: string
  @readable('product_id', Number, true) productId?: number | null
  @readable('to_email') toEmail!: string
  @readable('reply_email') replayEmail!: string
  @readable('group_id') groupId!: number
  @readable('primary_role') primaryRole!: boolean
  @readable active!: boolean

  @readable('updated_at') updatedAt!: Date
  @readable('created_at') createdAt!: Date
}

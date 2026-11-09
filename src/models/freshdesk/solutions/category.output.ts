import { readable } from '@ts-awesome/model-reader'

export class CategoryOutput {
  @readable id!: number
  @readable name!: string
  @readable(String, true) description?: string | null

  @readable('updated_at') updatedAt!: Date
  @readable('created_at') createdAt!: Date
}

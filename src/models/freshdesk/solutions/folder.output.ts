import { readable } from '@ts-awesome/model-reader'
import { HierarchyItem } from './hierarchy'

export class FolderOutput {
  @readable id!: number
  @readable name!: string
  @readable(String, true) description?: string | null
  @readable('parent_folder_id', Number, true) parentFolderId?: number | null
  @readable([HierarchyItem]) hierarchy!: HierarchyItem[]
  @readable('articles_count') articlesCount!: number
  @readable('sub_folders_count') subFoldersCount!: number
  @readable visibility!: number

  @readable('updated_at') updatedAt!: Date
  @readable('created_at') createdAt!: Date
}

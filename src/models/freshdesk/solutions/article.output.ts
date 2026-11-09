import { readable } from '@ts-awesome/model-reader'
import { HierarchyItem } from './hierarchy'

export enum ArticleStatus {
  Draft = 1,
  Published = 2,
}

export class ArticleOutput {
  @readable id!: number
  @readable type!: number
  @readable('category_id') categoryId!: number
  @readable('folder_id') folderId!: number
  @readable([HierarchyItem]) hierarchy!: HierarchyItem[]
  @readable('thumbs_up') thumbsUp!: number
  @readable('thumbs_down') thumbsDown!: number
  @readable hits!: number
  @readable([String]) tags!: string[]
  @readable('seo_data', Object) seoData!: Record<string, string>
  @readable('agent_id') agentId!: number
  @readable title!: string
  @readable description!: string
  @readable('description_text') descriptionText!: string
  @readable status!: ArticleStatus

  @readable('updated_at') updatedAt!: Date
  @readable('created_at') createdAt!: Date
}

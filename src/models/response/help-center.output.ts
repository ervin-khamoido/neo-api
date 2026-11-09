2021

import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

@OpenApiSchema({
  description: 'Help Center Article output model',
})
export class HelpCenterArticleOutput {
  @OpenApiSchemaProperty({
    description: 'Folder id',
    readOnly: true,
  })
  @readable
  id!: string

  @OpenApiSchemaProperty({
    description: 'article title',
    readOnly: true,
  })
  @readable
  title!: string

  @OpenApiSchemaProperty({
    description: 'article body',
    readOnly: true,
  })
  @readable
  description!: string

  @OpenApiSchemaProperty({
    description: 'article thumbs up',
    readOnly: true,
  })
  @readable
  thumbsUp!: number

  @OpenApiSchemaProperty({
    description: 'article thumbs down',
    readOnly: true,
  })
  @readable
  thumbsDown!: number
}

@OpenApiSchema({
  description: 'Help Center Folder output model',
})
export class HelpCenterFolderOutput {
  @OpenApiSchemaProperty({
    description: 'Folder id',
    readOnly: true,
  })
  @readable
  id!: string

  @OpenApiSchemaProperty({
    description: 'Folder name',
    readOnly: true,
  })
  @readable
  name!: string

  @OpenApiSchemaProperty({
    description: 'Folder articles',
    type: [HelpCenterArticleOutput],
    readOnly: true,
  })
  @readable([HelpCenterArticleOutput])
  articles!: HelpCenterArticleOutput[]
}

@OpenApiSchema({
  description: 'Help Center Category output model',
})
export class HelpCenterCategoryOutput {
  @OpenApiSchemaProperty({
    description: 'Category id',
    readOnly: true,
  })
  @readable
  id!: string

  @OpenApiSchemaProperty({
    description: 'Category name',
    readOnly: true,
  })
  @readable
  name!: string

  @OpenApiSchemaProperty({
    description: 'Category Folders',
    type: [HelpCenterFolderOutput],
    readOnly: true,
  })
  @readable([HelpCenterFolderOutput])
  folders!: HelpCenterFolderOutput[]
}

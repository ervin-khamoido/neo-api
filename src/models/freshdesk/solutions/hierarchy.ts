import { readable } from '@ts-awesome/model-reader'

class HierarchyItemData {
  @readable id!: number
  @readable name!: string
  @readable language!: string
}

export class HierarchyItem {
  @readable level!: number
  @readable type!: 'category' | 'folder'
  @readable(HierarchyItemData) data!: HierarchyItemData
}

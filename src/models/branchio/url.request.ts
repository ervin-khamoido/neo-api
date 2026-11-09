// import { readable } from '@ts-awesome/model-reader'

export interface IUrlRequest {
  data?: Record<string, string | null>
  alias?: string
  duration?: number // seconds
  identity?: string
  feature?: string
  channel?: string
  tags?: string[]
}

import { readable } from '@ts-awesome/model-reader'

export class UrlResponse {
  @readable() url!: string
}

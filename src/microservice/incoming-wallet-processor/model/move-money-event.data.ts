import { readable } from '@ts-awesome/model-reader'

export class MoveMoneyEventData {
  @readable(String, true) user?: string | null
}

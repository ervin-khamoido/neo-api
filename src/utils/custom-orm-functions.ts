import { FunctionCall } from '@ts-awesome/orm/dist/wrappers'
import { IOperandable } from '@ts-awesome/orm/dist/interfaces'

export function ormLower(value: string | IOperandable<string>) {
  return new FunctionCall('LOWER', [value])
}

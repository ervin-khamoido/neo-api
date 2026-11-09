import { OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'
import { TransferState } from '../../../services/dumb/on-chain/models/transfer.output'
import { BitGoTransferState } from '../../../services/webhooks/models/bitgo.input'

@OpenApiSchema({
  description: 'BitGo Transfer input model',
})
export class TransferInput {
  @OpenApiSchemaProperty({
    description: 'Event type to listen to. In this case "transfer"',
    writeOnly: true,
  })
  @readable
  type!: 'transfer'

  @OpenApiSchemaProperty({
    description: 'The on-chain transaction id',
    writeOnly: true,
  })
  @readable
  hash!: string

  @OpenApiSchemaProperty({
    description: 'Wallet ID',
    writeOnly: true,
  })
  @readable
  wallet!: string

  @OpenApiSchemaProperty({
    description: 'The BitGo Transfer ID',
    writeOnly: true,
  })
  @readable
  transfer!: string

  @OpenApiSchemaProperty({
    description: 'The BitGo Coin ID. e.g. tavaxc',
    writeOnly: true,
  })
  @readable
  coin!: string

  @OpenApiSchemaProperty({
    description: 'The BitGo Transfer State',
    writeOnly: true,
  })
  @readable
  state!: BitGoTransferState
}

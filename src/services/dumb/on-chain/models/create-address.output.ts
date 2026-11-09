import { readable } from '@ts-awesome/model-reader'

export class CreateAddressOutput {
  @readable id!: string
  @readable wallet!: string
}

/* Example of response:
{
  "id": "642d44823dbe750007472015bc7416e1",
  "chain": 0,
  "index": 13,
  "coin": "tavaxc",
  "lastNonce": 0,
  "wallet": "6408a740e8bb880007af3c8a0af25b57",
  "label": "test create",
  "coinSpecific": {
      "nonce": -1,
      "updateTime": "2023-04-05T09:50:58.062Z",
      "txCount": 0,
      "pendingChainInitialization": true,
      "creationFailure": [],
      "pendingDeployment": false,
      "forwarderVersion": 0
  }
}
*/

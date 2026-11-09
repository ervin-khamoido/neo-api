import { readable } from '@ts-awesome/model-reader'

export class AddressOutput {
  @readable id!: string
  @readable address!: string
  @readable coin!: string
  @readable wallet!: string
  @readable label!: string
}

/* Example of response:
{
    "id": "642c2de3b616b00007f467b3561ffff5",
    "address": "0x82ad2d11bf243a0138964f9b0377c0436cb5da16",
    "chain": 0,
    "index": 12,
    "coin": "tavaxc",
    "lastNonce": 0,
    "wallet": "6408a740e8bb880007af3c8a0af25b57",
    "label": "test create",
    "coinSpecific": {
        "nonce": -1,
        "updateTime": "2023-04-04T14:02:11.586Z",
        "txCount": 0,
        "pendingChainInitialization": false,
        "creationFailure": [],
        "pendingDeployment": false,
        "forwarderVersion": 0
    },
    "balance": {
        "updated": "2023-04-04T14:02:24.604Z",
        "balance": "0",
        "balanceString": "0",
        "totalReceived": "0",
        "totalSent": "0",
        "confirmedBalanceString": "0",
        "spendableBalanceString": "0",
        "tokens": {},
        "nfts": {},
        "unsupportedNfts": {}
    }
}
*/

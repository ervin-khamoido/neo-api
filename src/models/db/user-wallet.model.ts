2021

import { dbTable, dbField } from '@ts-awesome/orm'
import { IEntityService, Symbols } from '@ts-awesome/entity'

@dbTable('user_wallet')
export class UserWalletModel {
  @dbField({ primaryKey: true, name: 'user_id' })
  userId!: number

  @dbField({ name: 'wallet_id' })
  walletId!: string
}

export const UserWalletEntityServiceSymbol = Symbols.serviceFor(UserWalletModel)

export interface IUserWalletEntityService extends IEntityService<UserWalletModel, 'userId', never, never> {}

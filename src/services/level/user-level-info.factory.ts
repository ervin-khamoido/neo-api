import { UserLevel } from '../../models/db'
import { UserLevel0Info } from './user-level-0-info'
import { UserLevel1Info } from './user-level-1-info'
import { UserLevel2Info } from './user-level-2-info'
import { interfaces } from 'inversify'
import { IUserLevelInfo } from './user-level-info'

export type IUserLevelInfoFactory = <TRequirement>(userLevel: UserLevel) => IUserLevelInfo<TRequirement> | null
export const UserLevelInfoFactorySymbol = Symbol.for('IUserLevelInfoFactory')

export const userLevelInfoFactory: interfaces.FactoryCreator<any> = ({ container }) => (level: UserLevel) => {
  switch (level) {
    case UserLevel.Level0:
      return container.resolve(UserLevel0Info)
    case UserLevel.Level1:
      return container.resolve(UserLevel1Info)
    case UserLevel.Level2:
      return container.resolve(UserLevel2Info)
    default:
      return null
  }
}

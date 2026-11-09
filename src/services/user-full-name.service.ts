2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { IUserEntityService, UserEntityServiceSymbol } from '../models/db'
import { AppConfigSymbol, IAppConfig } from '../models/config'

type FullNameMatchReason = {
  reason: string
}

export interface FullNameMatchResult {
  match: boolean
  matchReason?: FullNameMatchReason | null
}

export type UserFullNameType = {
  firstName: string
  middleName?: string | null
  lastName: string
}

export interface IUserFullNameService {
  compose(fullName: UserFullNameType): string | null
  match(existingFullName: string, newFullName: string): FullNameMatchResult
}

const MINIMUM_FULLNAME_PARTS = 2

export const UserFullNameServiceSymbol = Symbol.for('IUserFullNameService')

@injectable()
export class UserFullNameService implements IUserFullNameService {
  @inject(AppConfigSymbol) appConfig!: IAppConfig

  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UserFullNameService)
  }

  compose(fullName: UserFullNameType): string | null {
    if (!fullName) {
      return null
    }

    return fullName.middleName
      ? `${fullName.firstName} ${fullName.middleName} ${fullName.lastName}`
      : `${fullName.firstName} ${fullName.lastName}`
  }

  /**
   * @description See matching details here https://neobank.atlassian.net/wiki/spaces/KNOW/pages/34701313/User+Bank+Accounts
   * @param existingFullName The full name considered correct by the system
   * @param newFullName The full name that should be matched to the one that is considered correct by the system
   */
  match(existingFullName: string, newFullName: string): FullNameMatchResult {
    const normalizedExistingFullName = this.normalizeFullNameForMatch(existingFullName)
    const normalizedNewFullName = this.normalizeFullNameForMatch(newFullName)

    const existingFullNameArr = this.splitFullName(normalizedExistingFullName)
    const newFullNameArr = this.splitFullName(normalizedNewFullName)

    // If the lengths are not the same, verify that all of the values in the shorter name appear in the longer name
    // The longer name should be one word longer at most
    if (existingFullNameArr.length !== newFullNameArr.length) {
      if (existingFullNameArr.length < MINIMUM_FULLNAME_PARTS) {
        this.logger.warn(
          `unexpected: existingFullName cannot contain less than ${MINIMUM_FULLNAME_PARTS} words for comparison`,
        )

        return {
          match: false,
          matchReason: {
            reason: `existingFullName cannot contain less than ${MINIMUM_FULLNAME_PARTS} words for comparison`,
          },
        }
      }

      if (newFullNameArr.length < MINIMUM_FULLNAME_PARTS) {
        this.logger.warn(
          `unexpected: newFullName cannot contain less than ${MINIMUM_FULLNAME_PARTS} words for comparison`,
        )

        return {
          match: false,
          matchReason: {
            reason: `newFullName cannot contain less than ${MINIMUM_FULLNAME_PARTS} words for comparison`,
          },
        }
      }

      const [differenceA, differenceB] = this.findDifferences(existingFullNameArr, newFullNameArr)

      const oneWordDifference =
        (differenceA.length === 0 && differenceB.length === 1) || (differenceA.length === 1 && differenceB.length === 0)

      if (oneWordDifference) {
        return {
          match: true,
          matchReason: {
            reason: `there is one word difference between matching full names`,
          },
        }
      }

      return {
        match: false,
        matchReason: {
          reason: `there is more than one word difference between matching full names`,
        },
      }
    }

    // find differences
    const [differenceA, differenceB] = this.findDifferences(existingFullNameArr, newFullNameArr)

    // if there is no difference then it's a match
    if (differenceA.length === 0 && differenceB.length === 0) {
      return {
        match: true,
        matchReason: {
          reason: `exact word matching`,
        },
      }
    }

    // try if there is a shortcut of one letter
    // 'Anna J Bond' === 'Anna Jay Bond' match
    // 'Anna J' !== 'Anna Jay' not match
    const minimumAllowedWordsInFullName = existingFullNameArr.length > 2
    if (differenceA.length === 1 && differenceB.length === 1 && minimumAllowedWordsInFullName) {
      const existingDifferencePart = differenceA[0]
      const newDifferencePart = differenceB[0]

      if (existingDifferencePart.length === 1 || newDifferencePart.length === 1) {
        const firstLetterMatches = existingDifferencePart[0] === newDifferencePart[0]

        if (firstLetterMatches) {
          return {
            match: true,
            matchReason: {
              reason: 'there is only one word difference, one of the words is one letter and the first letter matches',
            },
          }
        }

        return {
          match: false,
          matchReason: {
            reason:
              'there is only one word difference, one of the words is one letter and the first letter does not match',
          },
        }
      }
    }

    return {
      match: false,
      matchReason: {
        reason: `there is too much difference between matching full names`,
      },
    }
  }

  private findDifferences(existingFullNameArr: string[], newFullNameArr: string[]): [string[], string[]] {
    let differenceA: string[] = JSON.parse(JSON.stringify(existingFullNameArr))
    let differenceB: string[] = JSON.parse(JSON.stringify(newFullNameArr))
    for (let i = 0; i < differenceA.length; ) {
      const namePart = differenceA[i]
      const foundIndex = differenceB.indexOf(namePart)
      if (foundIndex > -1) {
        differenceB.splice(foundIndex, 1)
        differenceA.splice(i, 1)
      } else {
        i++
      }
    }

    return [differenceA, differenceB]
  }

  private normalizeFullNameForMatch(fullName: string): string {
    const result = fullName.replace(/[\,\.]+/i, '')
    return result
  }

  private splitFullName(fullName: string): string[] {
    const result = fullName
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(x => x !== '')
      .sort()

    return result
  }
}

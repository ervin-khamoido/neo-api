import { inject, injectable } from 'inversify'
import { IConfig } from 'config'

import { DuplicateValueDbError } from '@ts-awesome/orm-pg'
import { Insertable, Updatable } from '@ts-awesome/entity'
import { ConfigSymbol, ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import {
  UserModel,
  UserEntityServiceSymbol,
  IUserEntityService,
  activeUserStatuses,
  UserDetailsEntityServiceSymbol,
  IUserDetailsEntityService,
} from '../models/db'

import { NotFoundError, DuplicateFieldError, ConflictError } from '../errors'
import { ITokenService, ConfirmTokenServiceSymbol, IConfirmPayload } from './services/token'
import { IMailerService, MailerServiceSymbol } from './services/mailer'
import { UserSearchOutput } from '../models/response/user-search.output'
import { IOperandable } from '@ts-awesome/orm/dist/interfaces'
import { ormLower } from '../utils/custom-orm-functions'
import { of, or } from '@ts-awesome/orm'
import { UserSearchInfo } from '../models/user/user-search.info'

export const UserServiceSymbol = Symbol.for('IUserService')

export interface IUserService {
  create(user: InsertUser): Promise<UserModel>
  update(user: UpdateUser): Promise<UserModel>

  search(query: string): Promise<readonly UserSearchInfo[]>
}

type InsertUser = Insertable<UserModel, 'id' | 'uid' | 'updatedAt' | 'createdAt', 'tokenNbf'>
type UpdateUser = Updatable<UserModel, 'id', 'id' | 'uid' | 'updatedAt' | 'createdAt'>

@injectable()
export class UserService implements IUserService {
  @inject(UserEntityServiceSymbol) entityService!: IUserEntityService
  @inject(ConfirmTokenServiceSymbol) confirmTokenService!: ITokenService<IConfirmPayload>
  @inject(MailerServiceSymbol) mailerService!: IMailerService

  @inject(UserDetailsEntityServiceSymbol) userDetailsEntityService!: IUserDetailsEntityService

  private readonly logger: ILogger
  private readonly domain: string

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory, @inject(ConfigSymbol) config: IConfig) {
    this.logger = loggerFactory(UserService)
    this.domain = config.get('domain')
  }

  public async create(data: InsertUser): Promise<UserModel> {
    try {
      return await this.entityService.addOne(data)
    } catch (err) {
      if (err instanceof DuplicateValueDbError) {
        throw new ConflictError('User with a such phone, email already exists')
      }

      throw err
    }
  }

  public async update(user: UpdateUser): Promise<UserModel> {
    const oldUser = await this.entityService.getOne({ id: user.id })

    if (!oldUser) {
      throw new NotFoundError(`User not found`)
    }

    try {
      const updatedUser = await this.entityService.updateOne(user)

      return updatedUser!
    } catch (err) {
      if (err instanceof DuplicateValueDbError) {
        throw new DuplicateFieldError(err.column, err.value)
      }
      throw err
    }
  }

  async search(query: string): Promise<readonly UserSearchInfo[]> {
    const usernameQuery = query.replace(/[$\s]/gi, '').toLowerCase()
    const emailQuery = query.trim().toLowerCase()
    let phoneQuery: string | null = query.replace(/[+\s]/, '')

    // skip search if every query is less than a minimum length
    const allQueries = [usernameQuery, emailQuery]
    if (allQueries.every(query => query.length < MIN_SEARCH_QUERY_LENGTH)) {
      return []
    }

    // prevent a hack that users could use e.g.:
    // "234" - will return all users in the system because every phone is Nigerian
    if (phoneQuery.length < MIN_PHONE_SEARCH_QUERY_LENGTH) {
      phoneQuery = null
    }

    return this.userDetailsEntityService
      .select()
      .columns(x => [of(UserModel, 'uid'), x.firstName, x.lastName, x.username])
      .join(UserModel, (root, other) => root.userId.eq(other.id))
      .where(x => {
        const operands: (IOperandable<boolean> | boolean)[] = []

        if (usernameQuery) {
          operands.push(ormLower(x.username).like(`${usernameQuery}%`))
        }

        if (emailQuery) {
          operands.push(ormLower(x.email).like(`${emailQuery}%`))
        }

        if (phoneQuery) {
          operands.push(ormLower(x.phone).like(`+${phoneQuery}%`))
        }

        return or(...operands)
      })
      .where(x => x.status.in(activeUserStatuses))
      .fetch(UserSearchInfo)
  }
}

const MIN_SEARCH_QUERY_LENGTH = 3
const MIN_PHONE_SEARCH_QUERY_LENGTH = 6

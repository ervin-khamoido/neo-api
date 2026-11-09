2021

import { inject, injectable } from 'inversify'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'
import { presence, length, single, format } from '@ts-awesome/validate'
import { DuplicateValueDbError } from '@ts-awesome/orm-pg'
import { BadRequestError, NotFoundError } from '@ts-awesome/rest'

import { ConflictError } from '../errors'
import { ormLower } from '../utils/custom-orm-functions'
import { requiredMessage } from '../validation/messages'

import { IUsernameConfig, UsernameConfigSymbol } from '../models/config/username.config'
import { SimpleValidateOutput } from '../models/response/simple-validate.output'
import { IUserDetailsEntityService, UserDetailsEntityServiceSymbol } from '../models/db'

const UsernameField = 'Username'
const MinUsernameLength = 4
const MaxUsernameLength = 32
const InvalidUsernameMessage = `Please enter a valid username. The username must be between ${MinUsernameLength} and ${MaxUsernameLength} characters long and can only contain letters, numbers, and non-consecutive underscores (_)`

export interface IUsernameService {
  validate(value: string): Promise<SimpleValidateOutput>
  create(userId: number, value: string): Promise<void>
}

export const UsernameServiceSymbol = Symbol.for('IUsernameService')

@injectable()
export class UsernameService implements IUsernameService {
  @inject(UsernameConfigSymbol) usernameConfig!: IUsernameConfig
  @inject(UserDetailsEntityServiceSymbol) userDetailsService!: IUserDetailsEntityService

  private logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(UsernameService)
  }

  async validate(username: string): Promise<SimpleValidateOutput> {
    const result = single(
      username,
      // validators
      presence({ message: requiredMessage(UsernameField) }),
      format({ pattern: /^_?([a-z0-9]_?)+$/i, message: InvalidUsernameMessage }),
      length({ minimum: MinUsernameLength, maximum: MaxUsernameLength, message: InvalidUsernameMessage }),
    )

    if (result !== true) {
      this.logger.info(`username validation failed (${username}). ${[...result]?.join(', ')}`)

      return {
        valid: false,
        errors: ['Please enter a valid username'],
      }
    }

    const lowercaseUsername = username.toLowerCase()

    for (const pattern of this.usernameConfig.blacklist) {
      if (lowercaseUsername.includes(pattern.toLowerCase())) {
        return {
          valid: false,
          errors: [`${username} is not available, try a different username`],
        }
      }
    }

    const usernameExists = await this.userDetailsService.exists(x => ormLower(x.username).eq(lowercaseUsername))
    if (usernameExists) {
      return {
        valid: false,
        errors: [`${username} is not available, try a different username`],
      }
    }

    return { valid: true }
  }

  async create(userId: number, value: string): Promise<void> {
    const userDetails = await this.userDetailsService.getOne({ userId })
    if (!userDetails) {
      throw new NotFoundError('User details are not found')
    }

    if (userDetails.username) {
      throw new ConflictError('Username has already been set')
    }

    try {
      await this.userDetailsService.updateOne({ userId: userId, username: value, updatedBy: null })
    } catch (err) {
      if (err instanceof DuplicateValueDbError && err.column === 'username') {
        throw new BadRequestError(`${value} is not available, try a different username`)
      }

      throw err
    }
  }
}

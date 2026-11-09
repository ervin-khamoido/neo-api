2021

/* eslint-disable @typescript-eslint/no-extra-semi */

import { NoopLoggerFactory } from '../logger.mock'

import { UserStatus } from '../../../src/models/db'

import { UserStatusService } from '../../../src/services/user-status.service'

describe('UserStatusService', () => {
  const loggerFactory = NoopLoggerFactory
  let userStatusService: UserStatusService

  beforeEach(() => {
    userStatusService = new UserStatusService(loggerFactory)
  })

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('isUserActive()', () => {
    ;[
      { status: UserStatus.Active, result: true },
      { status: UserStatus.PinResetRequired, result: true },
      { status: UserStatus.DeletePending, result: false },
      { status: UserStatus.DeleteRetention, result: false },
      { status: UserStatus.Blocked, result: false },
    ].forEach(t => {
      test(`Should returned ${t.result} for ${t.status} user status`, async () => {
        // Mock the user status
        jest.spyOn(userStatusService, 'calculateUserStatus').mockImplementation(async () => t.status)

        const userId = 1
        const response = await userStatusService.isUserActive(userId)

        expect(response).toEqual(t.result)
      })
    })
  })
})

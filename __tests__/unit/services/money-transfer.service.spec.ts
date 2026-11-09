2021

import { ForbiddenError } from '@ts-awesome/rest'
import { ConflictError } from '../../../src/errors'

import { Mock, It } from 'moq.ts'
import { NoopLoggerFactory } from '../logger.mock'

import { UserLevel } from '../../../src/models/db'
import { UserCurrentLevelOutput } from '../../../src/models/response/user-current-level.output'
import { ActionApprovalResult, IActionApproval, UserActionType } from '../../../src/models/limits'

import { MoneyTransferService } from '../../../src/services/money-transfer.service'
import { IUserStatusService } from '../../../src/services/user-status.service'
import { IUserLevelService } from '../../../src/services/level/user-level.service'
import { IUserLimitService } from '../../../src/services/user-limit.service'

describe('MoneyTransferService', () => {
  const loggerFactory = NoopLoggerFactory
  let moneyTransferService: MoneyTransferService

  // User Status Service Resolver
  const userStatusServiceResolver = (isActiveValue: boolean) =>
    new Mock<IUserStatusService>()
      .setup(x => x.isUserActive(It.IsAny()))
      .returnsAsync(isActiveValue)
      .object()

  // User Level Service Resolver
  const userLevelServiceResolver = (userCurrentLevelOutputValue: UserCurrentLevelOutput) =>
    new Mock<IUserLevelService>()
      .setup(x => x.getUserLevel(It.IsAny()))
      .returnsAsync(userCurrentLevelOutputValue)
      .object()

  // User Limit Service Resolver
  const userLimitServiceResolver = (actionApprovalValue: IActionApproval) =>
    new Mock<IUserLimitService>()
      .setup(x => x.getActionApproval(It.IsAny(), It.IsAny(), It.IsAny()))
      .returnsAsync(actionApprovalValue)
      .object()

  beforeEach(() => {
    moneyTransferService = new MoneyTransferService(loggerFactory)

    // Reset services
    moneyTransferService.userStatusService = userStatusServiceResolver(It.IsAny())
    moneyTransferService.userLevelService = userLevelServiceResolver(It.IsAny())
    moneyTransferService.userLimitService = userLimitServiceResolver(It.IsAny())
  })

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('verifyUserCanSendAmount()', () => {
    test(`Should throw Forbidden Error for users in an inactive status`, async () => {
      // SETUP
      moneyTransferService.userStatusService = userStatusServiceResolver(false)

      // TEST
      const userId = 1
      const amountUsdc = 10
      const responsePromise = moneyTransferService.verifyUserCanSendAmount(userId, amountUsdc)

      // RESULTS
      await expect(responsePromise).rejects.toThrowError(ForbiddenError)
    })

    //
    ;[UserLevel.Level0, UserLevel.Level1].forEach(level => {
      test(`Should throw Forbidden Error for unverified users level ${level}`, async () => {
        // SETUP
        moneyTransferService.userStatusService = userStatusServiceResolver(false)

        const userLevelOutput: UserCurrentLevelOutput = {
          current: {
            code: level,
            label: 'level',
            message: 'level',
          },
        }
        moneyTransferService.userLevelService = userLevelServiceResolver(userLevelOutput)

        // TEST
        const userId = 1
        const amountUsdc = 10
        const responsePromise = moneyTransferService.verifyUserCanSendAmount(userId, amountUsdc)

        // RESULTS
        await expect(responsePromise).rejects.toThrowError(ForbiddenError)
      })
    })

    test(`Should not throw any errors for all restrictions passed and action approved`, async () => {
      // SETUP
      moneyTransferService.userStatusService = userStatusServiceResolver(true)

      const userLevelOutput: UserCurrentLevelOutput = {
        current: {
          code: UserLevel.Level2,
          label: 'level_2',
          message: 'level_2',
        },
      }
      moneyTransferService.userLevelService = userLevelServiceResolver(userLevelOutput)

      const actionApprovalOutput: IActionApproval = {
        actionType: UserActionType.Send,
        result: ActionApprovalResult.Approved,
        lockVersion: 1,
        timestamp: new Date(),
      }
      moneyTransferService.userLimitService = userLimitServiceResolver(actionApprovalOutput)

      // TEST
      const userId = 1
      const amountUsdc = 10
      const responsePromise = moneyTransferService.verifyUserCanSendAmount(userId, amountUsdc)

      // RESULTS
      await expect(responsePromise).resolves.not.toThrowError()
    })

    test(`Should throw Conflict Error when the amount exceeded the user's limit (aka the action is not approved)`, async () => {
      // SETUP
      moneyTransferService.userStatusService = userStatusServiceResolver(true)

      const userLevelOutput: UserCurrentLevelOutput = {
        current: {
          code: UserLevel.Level2,
          label: 'level_2',
          message: 'level_2',
        },
      }
      moneyTransferService.userLevelService = userLevelServiceResolver(userLevelOutput)

      const actionApprovalOutput: IActionApproval = {
        actionType: UserActionType.Send,
        result: ActionApprovalResult.Rejected,
        lockVersion: 1,
        timestamp: new Date(),
      }
      moneyTransferService.userLimitService = userLimitServiceResolver(actionApprovalOutput)

      // TEST
      const userId = 1
      const amountUsdc = 10
      const responsePromise = moneyTransferService.verifyUserCanSendAmount(userId, amountUsdc)

      // RESULTS
      await expect(responsePromise).rejects.toThrowError(ConflictError)
    })
  })

  describe('verifyUserCanReceiveAmount()', () => {
    test(`Should throw Forbidden Error for users in an inactive status`, async () => {
      // SETUP
      moneyTransferService.userStatusService = userStatusServiceResolver(false)

      // TEST
      const userId = 1
      const amountUsdc = 10
      const responsePromise = moneyTransferService.verifyUserCanReceiveAmount(userId, amountUsdc)

      // RESULTS
      await expect(responsePromise).rejects.toThrowError(ForbiddenError)
    })

    //
    ;[UserLevel.Level0, UserLevel.Level1].forEach(level => {
      test(`Should throw Forbidden Error for unverified users level ${level}`, async () => {
        // SETUP
        moneyTransferService.userStatusService = userStatusServiceResolver(false)

        const userLevelOutput: UserCurrentLevelOutput = {
          current: {
            code: level,
            label: 'level',
            message: 'level',
          },
        }
        moneyTransferService.userLevelService = userLevelServiceResolver(userLevelOutput)

        // TEST
        const userId = 1
        const amountUsdc = 10
        const responsePromise = moneyTransferService.verifyUserCanReceiveAmount(userId, amountUsdc)

        // RESULTS
        await expect(responsePromise).rejects.toThrowError(ForbiddenError)
      })
    })

    test(`Should not throw any errors for all restrictions passed and action approved`, async () => {
      // SETUP
      moneyTransferService.userStatusService = userStatusServiceResolver(true)

      const userLevelOutput: UserCurrentLevelOutput = {
        current: {
          code: UserLevel.Level2,
          label: 'level_2',
          message: 'level_2',
        },
      }
      moneyTransferService.userLevelService = userLevelServiceResolver(userLevelOutput)

      const actionApprovalOutput: IActionApproval = {
        actionType: UserActionType.Receive,
        result: ActionApprovalResult.Approved,
        lockVersion: 1,
        timestamp: new Date(),
      }
      moneyTransferService.userLimitService = userLimitServiceResolver(actionApprovalOutput)

      // TEST
      const userId = 1
      const amountUsdc = 10
      const responsePromise = moneyTransferService.verifyUserCanReceiveAmount(userId, amountUsdc)

      // RESULTS
      await expect(responsePromise).resolves.not.toThrowError()
    })

    test(`Should throw Conflict Error when the amount exceeded the user's limit (aka the action is not approved)`, async () => {
      // SETUP
      moneyTransferService.userStatusService = userStatusServiceResolver(true)

      const userLevelOutput: UserCurrentLevelOutput = {
        current: {
          code: UserLevel.Level2,
          label: 'level_2',
          message: 'level_2',
        },
      }
      moneyTransferService.userLevelService = userLevelServiceResolver(userLevelOutput)

      const actionApprovalOutput: IActionApproval = {
        actionType: UserActionType.Receive,
        result: ActionApprovalResult.Rejected,
        lockVersion: 1,
        timestamp: new Date(),
      }
      moneyTransferService.userLimitService = userLimitServiceResolver(actionApprovalOutput)

      // TEST
      const userId = 1
      const amountUsdc = 10
      const responsePromise = moneyTransferService.verifyUserCanReceiveAmount(userId, amountUsdc)

      // RESULTS
      await expect(responsePromise).rejects.toThrowError(ConflictError)
    })
  })
})

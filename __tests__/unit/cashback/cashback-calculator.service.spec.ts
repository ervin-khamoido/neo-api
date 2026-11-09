import currency from 'currency.js'
import { CashbackCalculator, ICashbackCalculator } from '../../../src/services/cashback/cashback-calculator.service'
import { NoopLoggerFactory } from '../logger.mock'

describe('CashbackCalculator', () => {
  describe('getCashbackValue()', () => {
    describe('Should calculate cashback when', () => {
      ;[
        { amountUsdc: 0.005123, minCashbackAmountPercentage: 0.02, maxCashbackAmountPercentage: 0.07 },
        { amountUsdc: 0.015, minCashbackAmountPercentage: 0.01, maxCashbackAmountPercentage: 0.02 },
        { amountUsdc: 0.1, minCashbackAmountPercentage: 0.01, maxCashbackAmountPercentage: 0.02 },
        { amountUsdc: 1, minCashbackAmountPercentage: 0.01, maxCashbackAmountPercentage: 0.02 },
        { amountUsdc: 1000, minCashbackAmountPercentage: 0.01, maxCashbackAmountPercentage: 0.02 },
        { amountUsdc: 28.526547, minCashbackAmountPercentage: 0.01, maxCashbackAmountPercentage: 1 },
      ].forEach(v => {
        test(`amountUsdc = ${v.amountUsdc}, minPercentage = ${v.minCashbackAmountPercentage}, maxPercentage = ${v.maxCashbackAmountPercentage}`, async () => {
          // run N subsequent runs for the same range
          const results: number[] = []
          for (let index = 0; index < 20; index++) {
            const cashbackCalculator = new CashbackCalculator(NoopLoggerFactory)

            let cashbackValue = await cashbackCalculator.getCashbackValue(
              v.amountUsdc,
              v.maxCashbackAmountPercentage,
              v.minCashbackAmountPercentage,
            )

            let minExpectedAmount = v.amountUsdc * v.minCashbackAmountPercentage
            let maxExpectedAmount = v.amountUsdc * v.maxCashbackAmountPercentage
            minExpectedAmount = currency(minExpectedAmount, { precision: 6 }).value
            maxExpectedAmount = currency(maxExpectedAmount, { precision: 6 }).value

            expect(cashbackValue.cashbackUsdc).toBeGreaterThanOrEqual(minExpectedAmount)
            expect(cashbackValue.cashbackUsdc).toBeLessThanOrEqual(maxExpectedAmount)

            results.push(cashbackValue.cashbackUsdc)
          }

          // check that we have a couple of different values
          const firstResult = results[0]
          const allValuesTheSame = results.every(x => x === firstResult)
          expect(allValuesTheSame).toEqual(false)
        })
      })
    })

    describe('Should round to 6 decimal places when', () => {
      ;[
        { amountUsdc: 1.795123, cashbackAmountPercentage: 0.03, expectedResult: 0.053854 },
        { amountUsdc: 1.795116, cashbackAmountPercentage: 0.03, expectedResult: 0.053853 },
        { amountUsdc: 21.635254, cashbackAmountPercentage: 0.21, expectedResult: 4.543403 },
      ].forEach(v => {
        test(`amountUsdc = ${v.amountUsdc}, cashback = ${v.cashbackAmountPercentage * 100}%, result = ${
          v.expectedResult
        }`, async () => {
          const cashbackCalculator = new CashbackCalculator(NoopLoggerFactory)

          let cashbackValue = await cashbackCalculator.getCashbackValue(
            v.amountUsdc,
            v.cashbackAmountPercentage,
            v.cashbackAmountPercentage,
          )

          expect(cashbackValue.cashbackUsdc).toEqual(v.expectedResult)
        })
      })
    })

    describe('Should throw errow when', () => {
      test('range max range is > 1 (100%)', async () => {
        const cashbackCalculator = new CashbackCalculator(NoopLoggerFactory)

        let cashbackValue = cashbackCalculator.getCashbackValue(1, 1.01, 0.01)
        await expect(cashbackValue).rejects.toThrowError(Error)
      })

      test('min range is > max range', async () => {
        const cashbackCalculator = new CashbackCalculator(NoopLoggerFactory)

        let cashbackValue = cashbackCalculator.getCashbackValue(1, 0.01, 0.02)
        await expect(cashbackValue).rejects.toThrowError()
      })

      test('min range is less than 1%', async () => {
        const cashbackCalculator = new CashbackCalculator(NoopLoggerFactory)

        let cashbackValue = cashbackCalculator.getCashbackValue(1, 0.01, 0.001)
        await expect(cashbackValue).rejects.toThrowError(Error)
      })

      test('max range is less than 1%', async () => {
        const cashbackCalculator = new CashbackCalculator(NoopLoggerFactory)

        let cashbackValue = cashbackCalculator.getCashbackValue(1, 0.001, 0.01)
        await expect(cashbackValue).rejects.toThrowError(Error)
      })
    })
  })

  describe('getPercentageValue()', () => {
    let cashbackCalculator: ICashbackCalculator
    beforeEach(() => {
      cashbackCalculator = new CashbackCalculator(NoopLoggerFactory)
    })

    describe('Should calculate percentage correctly when', () => {
      ;[
        { cashbackValue: 1, totalUsdc: 100, result: 0.01 },
        { cashbackValue: 1.23, totalUsdc: 65.543621, result: 0.0188 /* 0.0187661282857717 */ },
        { cashbackValue: 3.535362, totalUsdc: 65.543621, result: 0.0539 /* 0.0539390705923922 */ },
        { cashbackValue: 3.735362, totalUsdc: 65.543621, result: 0.057 /* 0.0569904735656884 */ },
      ].forEach(t => {
        test(`cashbackValue: ${t.cashbackValue}, totalUsdc: ${t.totalUsdc}, result: ${t.result}`, () => {
          const result = cashbackCalculator.getPercentageValue(t.cashbackValue, t.totalUsdc)

          expect(result).toStrictEqual(t.result)
        })
      })
    })
  })
})
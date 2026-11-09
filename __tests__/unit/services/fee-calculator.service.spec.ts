import { FeeCalculatorV2Service } from '../../../src/services/fee-calculator.service'

describe('FeeCalculatorV2Service', () => {
  const service = new FeeCalculatorV2Service()

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('calculate()', () => {
    ;[10, 1000000].forEach(amount => {
      test(`Should return amount and fee config. Amount: ${amount}`, async () => {
        const response = await service.calculate(amount, {
          flatFee: 150,
          percentageFee: 0.0127,
          agentFee: <any>null,
          feeMultiplier: <any>null,
        })
        expect(response.total).toBeDefined()
        expect(response.config).toBeDefined()
        expect(response.config.flatFee).toEqual(150)
        expect(response.config.percentageFee).toEqual(0.0127)
      })
    })
    ;[10, 1000, 12000, 12000.39].forEach(amount => {
      test(`Should use flatFee. Amound: ${amount}`, async () => {
        const response = await service.calculate(amount, {
          flatFee: 150,
          percentageFee: 0.0125,
          agentFee: <any>null,
          feeMultiplier: <any>null,
        })
        expect(response.total).toEqual(150)
      })
    })
    ;[
      { amount: 10, result: 0.13 },
      { amount: 12.4, result: 0.16 },
      { amount: 35462.53, result: 443.28 },
    ].forEach(t => {
      test(`Should be double digit fraction. Amound: ${t.amount}`, async () => {
        const response = await service.calculate(t.amount, {
          flatFee: 0,
          percentageFee: 0.0125,
          agentFee: <any>null,
          feeMultiplier: <any>null,
        })
        expect(response.total).toEqual(t.result)
      })
    })
    ;[
      { amount: 12000.4, result: 150.01 },
      { amount: 100000, result: 1250 },
    ].forEach(t => {
      test(`Should use percentageFee fee. Amount: ${t.amount}`, async () => {
        const response = await service.calculate(t.amount, {
          flatFee: 0,
          percentageFee: 0.0125,
          agentFee: <any>null,
          feeMultiplier: <any>null,
        })
        expect(response.total).toEqual(t.result)
      })
    })
  })
})

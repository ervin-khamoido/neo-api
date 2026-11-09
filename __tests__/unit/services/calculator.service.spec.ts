2021

import { CalculatorV2Service } from '../../../src/services/calculator.service'
import { IFeeCalculatorService, IFeeConfig } from '../../../src/services/fee-calculator.service'

describe('CalculatorV2Service', () => {
  const service = new CalculatorV2Service()
  const feeCalculatorService: Partial<IFeeCalculatorService> = {
    calculate: jest.fn(() => Promise.resolve({ total: 0, config: <IFeeConfig>{ flatFee: 0, percentageFee: 0 } })),
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('calculateBuyUsdcTotals()', () => {
    ;[
      { i: { amount: 5000, totalUsdc: 8.2, xr: 610 }, o: { amount: 5002, calculatedTotalUsdc: 8.2 } },
      { i: { amount: 5000, totalUsdc: 7.14, xr: 700 }, o: { amount: 4998, calculatedTotalUsdc: 7.14 } },
      { i: { amount: 20000, totalUsdc: 28.57, xr: 700 }, o: { amount: 19999, calculatedTotalUsdc: 28.57 } },
      { i: { amount: 19999.5, totalUsdc: 28.57, xr: 700 }, o: { amount: 19999, calculatedTotalUsdc: 28.57 } },
      { i: { amount: 19999, totalUsdc: 28.57, xr: 700 }, o: { amount: 19999, calculatedTotalUsdc: 28.57 } },
      { i: { amount: 19998, totalUsdc: 28.57, xr: 700 }, o: { amount: 19999, calculatedTotalUsdc: 28.57 } },
    ].forEach(t => {
      test(`Should recalculate amount based on the fraction (Entered NGN). Amount: ${t.i.amount}`, async () => {
        const response = await service.calculateBuyUsdcTotals(
          {
            amount: t.i.amount,
            total: t.i.amount,
            totalUsdc: t.i.totalUsdc,
          },
          {
            exchangeRate: t.i.xr,
            feeConfig: <IFeeConfig>{
              flatFee: 0,
              percentageFee: 0,
            },
          },
          <IFeeCalculatorService>feeCalculatorService,
          false,
        )

        expect(response.amount).toEqual(t.o.amount)
        expect(response.calculatedTotalUsdc).toEqual(t.o.calculatedTotalUsdc)
      })
    })
    ;[
      { i: { amount: 20000.43, totalUsdc: 28.57, xr: 700.05 }, o: { amount: 20000.43, calculatedTotalUsdc: 28.57 } },
      { i: { amount: 1018.5, totalUsdc: 1.4549, xr: 700.05 }, o: { amount: 1015.07, calculatedTotalUsdc: 1.45 } },
      { i: { amount: 1018.57, totalUsdc: 1.457, xr: 700.05 }, o: { amount: 1015.07, calculatedTotalUsdc: 1.45 } },
    ].forEach(t => {
      test(`Should recalculate amount based on the fraction (Entered USDC). Amount: ${t.i.amount}`, async () => {
        const response = await service.calculateBuyUsdcTotals(
          {
            amount: t.i.amount,
            total: t.i.amount,
            totalUsdc: t.i.totalUsdc,
          },
          {
            exchangeRate: t.i.xr,
            feeConfig: <IFeeConfig>{
              flatFee: 0,
              percentageFee: 0,
            },
          },
          <IFeeCalculatorService>feeCalculatorService,
          false,
        )

        expect(response.amount).toEqual(t.o.amount)
        expect(response.calculatedTotalUsdc).toEqual(t.o.calculatedTotalUsdc)
      })
    })
    ;[
      {
        i: { amount: 20000, totalUsdc: 28.57, flatFee: 100.29, xr: 700 },
        o: { calculatedTotal: 20099.29, calculatedTotalUsdc: 28.57 },
      },
      {
        i: { amount: 19999.5, totalUsdc: 28.57, flatFee: 100.29, xr: 700 },
        o: { calculatedTotal: 20099.29, calculatedTotalUsdc: 28.57 },
      },
      {
        i: { amount: 19999, totalUsdc: 28.57, flatFee: 100.29, xr: 700 },
        o: { calculatedTotal: 20099.29, calculatedTotalUsdc: 28.57 },
      },
      {
        i: { amount: 19998, totalUsdc: 28.57, flatFee: 100.29, xr: 700 },
        o: { calculatedTotal: 20099.29, calculatedTotalUsdc: 28.57 },
      },
      {
        i: { amount: 1018.5, totalUsdc: 1.4549, flatFee: 100.29, xr: 700.05 },
        o: { calculatedTotal: 1115.36, calculatedTotalUsdc: 1.45 },
      },
    ].forEach(t => {
      test(`Should recalculate amount based on the fraction (Entered NGN) with Fees. Amount: ${t.i.amount}`, async () => {
        const customFeeCalculatorService: Partial<IFeeCalculatorService> = {
          calculate: jest.fn(() =>
            Promise.resolve({ total: t.i.flatFee, config: <IFeeConfig>{ flatFee: 0, percentageFee: 0 } }),
          ),
        }

        const response = await service.calculateBuyUsdcTotals(
          {
            amount: t.i.amount,
            total: t.i.amount,
            totalUsdc: t.i.totalUsdc,
          },
          {
            exchangeRate: t.i.xr,
            feeConfig: <IFeeConfig>{
              flatFee: 0,
              percentageFee: 0,
            },
          },
          <IFeeCalculatorService>customFeeCalculatorService,
          false,
        )

        expect(response.calculatedTotal).toEqual(t.o.calculatedTotal)
        expect(response.calculatedTotalUsdc).toEqual(t.o.calculatedTotalUsdc)
      })
    })
  })

  describe('calculateSellUsdcTotals()', () => {
    ;[
      { i: { amount: 5000, amountUsdc: 8.2, xr: 610 }, o: { amount: 5002, amountUsdc: 8.2 } },
      { i: { amount: 5000, amountUsdc: 7.14, xr: 700 }, o: { amount: 4998, amountUsdc: 7.14 } },
      { i: { amount: 20000, amountUsdc: 28.57, xr: 700 }, o: { amount: 19999, amountUsdc: 28.57 } },
      { i: { amount: 19999.5, amountUsdc: 28.57, xr: 700 }, o: { amount: 19999, amountUsdc: 28.57 } },
      { i: { amount: 19999, amountUsdc: 28.57, xr: 700 }, o: { amount: 19999, amountUsdc: 28.57 } },
      { i: { amount: 19998, amountUsdc: 28.57, xr: 700 }, o: { amount: 19999, amountUsdc: 28.57 } },
    ].forEach(t => {
      test(`Should recalculate amount based on the fraction (Entered NGN). Amount: ${t.i.amount}`, async () => {
        const response = await service.calculateSellUsdcTotals(
          {
            amount: t.i.amount,
            amountUsdc: t.i.amountUsdc,
          },
          {
            exchangeRate: t.i.xr,
            feeConfig: <IFeeConfig>{
              flatFee: 0,
              percentageFee: 0,
            },
          },
          <IFeeCalculatorService>feeCalculatorService,
          false,
        )

        expect(response.amountUsdc).toEqual(t.o.amountUsdc)
        expect(response.calculatedPurchaseAmount).toEqual(t.o.amount)
      })
    })
    ;[
      {
        i: { amount: 100, amountUsdc: 1, flatFee: 10, xr: 100 },
        o: { calculatedTotal: 90, amountUsdc: 1, calculatedPurchaseAmount: 100 },
      },
      {
        i: { amount: 104, amountUsdc: 1, flatFee: 10, xr: 100 },
        o: { calculatedTotal: 90, amountUsdc: 1, calculatedPurchaseAmount: 100 },
      },
      {
        i: { amount: 99.25, amountUsdc: 1, flatFee: 10, xr: 100 },
        o: { calculatedTotal: 90, amountUsdc: 1, calculatedPurchaseAmount: 100 },
      },
      {
        i: { amount: 101.02, amountUsdc: 1.01, flatFee: 10, xr: 100.05 },
        o: { calculatedTotal: 91.05, amountUsdc: 1.01, calculatedPurchaseAmount: 101.05 },
      },
    ].forEach(t => {
      test(`Should recalculate amount based on the fraction (Entered NGN) with Fees. Amount: ${t.i.amount}`, async () => {
        const customFeeCalculatorService: Partial<IFeeCalculatorService> = {
          calculate: jest.fn(() =>
            Promise.resolve({ total: t.i.flatFee, config: <IFeeConfig>{ flatFee: 0, percentageFee: 0 } }),
          ),
        }

        const response = await service.calculateSellUsdcTotals(
          {
            amount: t.i.amount,
            amountUsdc: t.i.amountUsdc,
          },
          {
            exchangeRate: t.i.xr,
            feeConfig: <IFeeConfig>{
              flatFee: 0,
              percentageFee: 0,
            },
          },
          <IFeeCalculatorService>customFeeCalculatorService,
          false,
        )

        expect(response.amountUsdc).toEqual(t.o.amountUsdc)
        expect(response.calculatedPurchaseAmount).toEqual(t.o.calculatedPurchaseAmount)
        expect(response.calculatedTotal).toEqual(t.o.calculatedTotal)
      })
    })
    ;[
      {
        i: { amount: 100.015, amountUsdc: 1.019, flatFee: 10, xr: 100.05 },
        o: { calculatedTotal: 91.05, amountUsdc: 1.01, calculatedPurchaseAmount: 101.05 },
      },
      {
        i: { amount: 100.015, amountUsdc: 1.011, flatFee: 10, xr: 100.05 },
        o: { calculatedTotal: 91.05, amountUsdc: 1.01, calculatedPurchaseAmount: 101.05 },
      },
      {
        i: { amount: 100.015, amountUsdc: 1.011, flatFee: 10.01, xr: 100.0556 },
        o: { calculatedTotal: 91.05, amountUsdc: 1.01, calculatedPurchaseAmount: 101.06 },
      },
    ].forEach(t => {
      test(`Should floor 2 decimal places for amount in USDC with Fees. Amount: ${t.i.amount}`, async () => {
        const customFeeCalculatorService: Partial<IFeeCalculatorService> = {
          calculate: jest.fn(() =>
            Promise.resolve({ total: t.i.flatFee, config: <IFeeConfig>{ flatFee: 0, percentageFee: 0 } }),
          ),
        }

        const response = await service.calculateSellUsdcTotals(
          {
            amount: t.i.amount,
            amountUsdc: t.i.amountUsdc,
          },
          {
            exchangeRate: t.i.xr,
            feeConfig: <IFeeConfig>{
              flatFee: 0,
              percentageFee: 0,
            },
          },
          <IFeeCalculatorService>customFeeCalculatorService,
          false,
        )

        expect(response.amountUsdc).toEqual(t.o.amountUsdc)
        expect(response.calculatedPurchaseAmount).toEqual(t.o.calculatedPurchaseAmount)
        expect(response.calculatedTotal).toEqual(t.o.calculatedTotal)
      })
    })

    test(`Should return 0 if fee amount is greater than NGN equivalent`, async () => {
      const customFeeCalculatorService: Partial<IFeeCalculatorService> = {
        calculate: jest.fn(() => Promise.resolve({ total: 100, config: <IFeeConfig>{ flatFee: 0, percentageFee: 0 } })),
      }

      const response = await service.calculateSellUsdcTotals(
        {
          amount: 50,
          amountUsdc: 1,
        },
        {
          exchangeRate: 50,
          feeConfig: <IFeeConfig>{
            flatFee: 0,
            percentageFee: 0,
          },
        },
        <IFeeCalculatorService>customFeeCalculatorService,
        false,
      )

      expect(response.amountUsdc).toEqual(1)
      expect(response.calculatedPurchaseAmount).toEqual(50)
      expect(response.calculatedTotal).toEqual(0)
    })
  })
})

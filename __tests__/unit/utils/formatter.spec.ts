import { AMOUNT, NGN, PERCENTAGE, USDC } from '../../../src/utils/formatter'

describe('formatter', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('NGN()', () => {
    ;[
      { i: 10, o: '₦ 10' },
      { i: 1005, o: '₦ 1,005' },
      { i: 0.25, o: '₦ 0.25' },
      { i: 0.251, o: '₦ 0.25' },
      { i: 0.255, o: '₦ 0.26' },
      { i: 0.2, o: '₦ 0.20' },
      { i: 1234567890, o: '₦ 1,234,567,890' },
      { i: 1234567890.99, o: '₦ 1,234,567,890.99' },
    ].forEach(t => {
      test(`Should format Naira. Amount: ${t.i}, Result: ${t.o}`, async () => {
        const result = NGN(t.i)
        expect(result).toEqual(t.o)
      })
    })
  })
  describe('USDC()', () => {
    ;[
      { i: 10, o: '$ 10' },
      { i: 1005, o: '$ 1,005' },
      { i: 0.25, o: '$ 0.25' },
      { i: 0.251, o: '$ 0.25' },
      { i: 0.255, o: '$ 0.26' },
      { i: 0.2, o: '$ 0.20' },
      { i: 1234567890, o: '$ 1,234,567,890' },
      { i: 1234567890.99, o: '$ 1,234,567,890.99' },
    ].forEach(t => {
      test(`Should format Naira. Amount: ${t.i}, Result: ${t.o}`, async () => {
        const result = USDC(t.i)
        expect(result).toEqual(t.o)
      })
    })
  })
  describe('AMOUNT()', () => {
    ;[
      { i: 10, o: '10' },
      { i: 1005, o: '1,005' },
      { i: 0.25, o: '0.25' },
      { i: 0.251, o: '0.25' },
      { i: 0.255, o: '0.26' },
      { i: 0.2, o: '0.20' },
      { i: 1234567890, o: '1,234,567,890' },
      { i: 1234567890.99, o: '1,234,567,890.99' },
    ].forEach(t => {
      test(`Should format Naira. Amount: ${t.i}, Result: ${t.o}`, async () => {
        const result = AMOUNT(t.i)
        expect(result).toEqual(t.o)
      })
    })
  })
  describe('PERCENTAGE()', () => {
    ;[
      { i: 0.0001, o: '0.01%' },
      { i: 0.00011, o: '0.01%' },
      { i: 0.00015, o: '0.02%' },
      { i: 0.01, o: '1%' },
      { i: 0.0101, o: '1.01%' },
      { i: 0.1, o: '10%' },
      { i: 0.99, o: '99%' },
      { i: 1, o: '100%' },
      { i: 10, o: '1,000%' },
      { i: 10.0001, o: '1,000.01%' },
      { i: 10000, o: '1,000,000%' },
    ].forEach(t => {
      test(`Should format Naira. Amount: ${t.i}, Result: ${t.o}`, async () => {
        const result = PERCENTAGE(t.i)
        expect(result).toEqual(t.o)
      })
    })
  })
})

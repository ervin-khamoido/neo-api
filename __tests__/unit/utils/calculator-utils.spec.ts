import { floorAmount } from '../../../src/utils/calculator-utils'

describe('calculator-utils', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('floorAmount()', () => {
    ;[
      // 0 precision
      { i: 10, f: 0, o: 10 },
      { i: 1005, f: 0, o: 1005 },
      { i: 0.2, f: 0, o: 0 },
      { i: 0.76372654525, f: 0, o: 0 },
      { i: 99999.999999, f: 0, o: 99999 },
      { i: 99999.99999999999, f: 0, o: 99999 },
      // 2 precision
      { i: 10, f: 2, o: 10 },
      { i: 1005, f: 2, o: 1005 },
      { i: 0.2, f: 2, o: 0.2 },
      { i: 0.25, f: 2, o: 0.25 },
      { i: 0.251, f: 2, o: 0.25 },
      { i: 0.255, f: 2, o: 0.25 },
      { i: 0.76372654525, f: 2, o: 0.76 },
      { i: 99999.999999, f: 2, o: 99999.99 },
      { i: 99999.99999999999, f: 2, o: 99999.99 },
      { i: 99999.999999999999, f: 2, o: 100000 }, // limitation of js to have 11 decimals precision
      // 6 precision
      { i: 10, f: 6, o: 10 },
      { i: 1005, f: 6, o: 1005 },
      { i: 0.2, f: 6, o: 0.2 },
      { i: 0.25, f: 6, o: 0.25 },
      { i: 0.251, f: 6, o: 0.251 },
      { i: 0.255, f: 6, o: 0.255 },
      { i: 0.76372654525, f: 6, o: 0.763726 },
      { i: 99999.999999, f: 6, o: 99999.999999 },
      { i: 99999.99999999999, f: 6, o: 99999.999999 },
      { i: 99999.999999999999, f: 6, o: 100000 }, // limitation of js to have 11 decimals precision
    ].forEach(t => {
      test(`Should floor amount. Amount: ${t.i}, F: ${t.f}, Result: ${t.o}`, async () => {
        const result = floorAmount(t.i, t.f)
        expect(result).toStrictEqual(t.o)
      })
    })
  })
})

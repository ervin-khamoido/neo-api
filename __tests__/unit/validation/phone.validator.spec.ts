import { PhoneValidator } from '../../../src/validation/phone.validator'

describe('PhoneValidator', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validate()', () => {
    describe('valid', () => {
      ;[
        '23445',
        '234-111-111-1111',
        '+234-111-111-1111',
        '+234 - 111 - 111 - 1111',
        '2341111111111',
        '+2341111111111',
        '+234111111111',
        '+23411111111111',
        '+234111111111111',
        '+2341111111111111',
        '+234(111)1111111111',
        '+2 341 111  1113',
        //
      ].forEach(phone => {
        const validator = new PhoneValidator()
        validator.phoneList = {
          white: [],
          black: [],
        }
        test(`Any phone number that starts with NG code should pass validation. Phone: ${phone}`, async () => {
          const result = validator.validate(phone)
          expect(result).toEqual(true)
        })
      })
      ;[
        '+11111',
        '+111111111111',
        '+919535110075',
        '+9195351112345321',
        //
      ].forEach(phone => {
        const validator = new PhoneValidator()
        validator.phoneList = {
          white: [phone],
          black: [],
        }
        test(`Any whitelisted number should pass validation. Phone: ${phone}`, async () => {
          const result = validator.validate(phone)
          expect(result).toEqual(true)
        })
      })
      ;[
        undefined,
        null,
        '',
        //
      ].forEach(phone => {
        const validator = new PhoneValidator()
        validator.phoneList = {
          white: [],
          black: [],
        }
        test(`The phone should be valid when phone number is not required and phone is not set. Phone: ${phone}`, async () => {
          const result = validator.validate(<string>phone, { required: false })
          expect(result).toEqual(true)
        })
      })
    })
    describe('invalid', () => {
      ;[
        undefined,
        null,
        '',
        //
      ].forEach(phone => {
        const validator = new PhoneValidator()
        validator.phoneList = {
          white: [],
          black: [],
        }
        test(`The phone should be invalid when phone number is required and phone is not set. Phone: ${phone}`, async () => {
          const result = validator.validate(<string>phone, { required: true })
          expect(result).toEqual(['Please enter your phone number'])
        })
      })
      ;[
        '380971777777',
        '+380971777777',
        '+12097177777',
        //
      ].forEach(phone => {
        const validator = new PhoneValidator()
        validator.phoneList = {
          white: [],
          black: [],
        }
        test(`The country code is not supported when phone number is not Nigerian. Phone: ${phone}`, async () => {
          const result = validator.validate(<string>phone, { required: true })
          expect(result).toEqual(["Sorry, we don't support your country yet"])
        })
      })
      ;[
        '+2345', // too short
        '12097+17777',
        '12097and',
        '120973234!',
        '1209))73234',
        'phone',
        '+23411111111111113', // too long
        //
      ].forEach(phone => {
        const validator = new PhoneValidator()
        validator.phoneList = {
          white: [],
          black: [],
        }
        test(`The phone number is invalid when string does not represent a phone. Phone: ${phone}`, async () => {
          const result = validator.validate(<string>phone, { required: true })
          expect(result).toEqual(['Please enter a valid phone number'])
        })
      })
    })
  })
})

import { IValidator, ModelValidator } from '@ts-awesome/validate'
import { SignUpV2Input } from '../../../../src/models/request/sign-up-v2.input'
import { Country } from '../../../../src/models/db'

const getValidModel = (): SignUpV2Input => {
  let model = new SignUpV2Input()

  model.address = null
  model.country = Country.Nigeria
  model.dateOfBirth = <any>'2002-01-01'
  model.firstName = 'a'
  model.middleName = null
  model.lastName = 'a'
  model.username = ''
  model.referrerCode = null

  return model
}

describe('SignUpV2Input', () => {
  var validator: IValidator<SignUpV2Input>

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validate()', () => {
    const validModel = getValidModel()
    // 128 chars
    const longestNamePart =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxzyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxzyz-ABCDEFGHIJKLMNOpqrstu'

    beforeEach(() => {
      validator = new ModelValidator(SignUpV2Input)
    })

    describe('valid', () => {
      const namePartPatterns = ['a', 'a-', 'Test-Best', 'fest-Best-', 'NEOBANK', longestNamePart]

      test(`Should be valid for default valid model`, async () => {
        const result = validator.validate(validModel)
        expect(result).toEqual(true)
      })

      describe('firstName', () => {
        ;[...namePartPatterns].forEach(t => {
          test(`Should be valid firstName = '${t}'`, async () => {
            let model = { ...validModel, firstName: t }

            const result = validator.validate(model)
            expect(result).toEqual(true)
          })
        })
      })

      describe('middleName', () => {
        ;[null, undefined, '', ...namePartPatterns].forEach(t => {
          test(`Should be valid middleName = '${t}'`, async () => {
            let model = { ...validModel, middleName: t }

            const result = validator.validate(model)
            expect(result).toEqual(true)
          })
        })
      })

      describe('lastName', () => {
        ;[...namePartPatterns].forEach(t => {
          test(`Should be valid lastName = '${t}'`, async () => {
            let model = { ...validModel, lastName: t }

            const result = validator.validate(model)
            expect(result).toEqual(true)
          })
        })
      })

      // TODO: add more tests for the other fields
    })

    describe('invalid', () => {
      const namePartPatterns = [longestNamePart + 'Z', '$asdb', '_', '7345sdf-f']

      describe('firstName', () => {
        ;[null, undefined, '', ...namePartPatterns].forEach(t => {
          test(`Should be invalid firstName = '${t}'`, async () => {
            let model = { ...validModel, firstName: <any>t }

            const result = validator.validate(model)
            expect(result).toBeInstanceOf(Array)
          })
        })
      })

      describe('middleName', () => {
        ;[...namePartPatterns].forEach(t => {
          test(`Should be invalid middleName = '${t}'`, async () => {
            let model = { ...validModel, middleName: t }

            const result = validator.validate(model)
            expect(result).toBeInstanceOf(Array)
          })
        })
      })

      describe('lastName', () => {
        ;[null, undefined, '', ...namePartPatterns].forEach(t => {
          test(`Should be invalid lastName = '${t}'`, async () => {
            let model = { ...validModel, lastName: <any>t }

            const result = validator.validate(model)
            expect(result).toBeInstanceOf(Array)
          })
        })
      })

      // TODO: add more tests for the other fields
    })

    // TESTING
    // test('year', () => {
    //   const date1 = new Date('2005-01-01')
    //   const date2 = new Date('2022-12-31')
    //   let result = differenceInCalendarYears(date2, date1)
    //   console.log(result) // 17
    // })
  })
})

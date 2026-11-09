import { inject, injectable } from 'inversify'
import { IValidator } from '@ts-awesome/validate'
import { ISingleValidationOptions } from '@ts-awesome/validate/src/interfaces'
import { IPhoneListConfig, PhoneListConfigSymbol } from '../models/config'

// IMPORTANT: DO NOT USE
// libphonenumber-js, it marks our virtual numbers (like +234 111 111 1111) as invalid

// some info about phone numbers https://www.quora.com/What-is-maximum-and-minimum-length-of-any-mobile-number-across-the-world
const FormattedPhoneRegex = /^(\+?\d+)\s?-?\s?(\(?\d+\)?)\s?-?\s?\d+\s?-?\s?\d+$/i
const CleanPhoneRegex = /^\+\d{5,16}$/i // min cell phone number is 1 digit code + 4 digit number, longest 3 digit code + 13 digit number

@injectable()
export class PhoneValidator implements IValidator<string> {
  @inject(PhoneListConfigSymbol) phoneList!: IPhoneListConfig

  private countryCodes = ['+234']

  validate(value: string, options?: ISingleValidationOptions): true | readonly string[] {
    const phone = value

    if (options?.required === true && !phone) {
      return ['Please enter your phone number']
    } else if (!phone) {
      return true
    }

    // check if the phone number contains allowed characters in formatted manner
    if (!FormattedPhoneRegex.test(phone)) {
      return ['Please enter a valid phone number']
    }

    // clean up the phone to +##########..
    let cleanPhone = `+${(phone.match(/\d+/g) ?? ['']).join('')}`

    if (!CleanPhoneRegex.test(cleanPhone)) {
      return ['Please enter a valid phone number']
    }

    // whitelist phone numbers are accepted without country code validation
    if (this.phoneList.white && this.phoneList.white.includes(cleanPhone)) {
      return true
    }

    if (!this.countryCodes.some(x => cleanPhone.startsWith(x))) {
      return ["Sorry, we don't support your country yet"]
    }

    return true
  }
}

2021

import { inject, injectable } from 'inversify'

import { format, utcToZonedTime } from 'date-fns-tz'
import { enZA } from 'date-fns/locale'

export interface IDateFormatterService {
  utcToNgTimeString(date: Date): Promise<string>
}

export const DateFormatterServiceSymbol = Symbol.for('IDateFormatterService')

@injectable()
export class DateFormatterService implements IDateFormatterService {
  async utcToNgTimeString(date: Date): Promise<string> {
    const ngTimeZone = 'Africa/Lagos'
    const pattern = "dd.MM.yyyy HH:mm:ss.SSS 'GMT' XXX (z)"

    return format(utcToZonedTime(date, ngTimeZone), pattern, {
      timeZone: ngTimeZone,
      locale: enZA,
    })
  }
}

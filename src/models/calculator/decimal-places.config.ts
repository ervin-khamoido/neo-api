2021

export class DecimalPlacesConfig {
  private _decimalPlaces: number
  private _decimalMultiplier: number

  get decimalPlaces() {
    return this._decimalPlaces
  }

  get decimalMultiplier() {
    return this._decimalMultiplier
  }

  constructor(decimalPlaces: number) {
    if (decimalPlaces < 0) {
      throw new Error('unsupported: decimal places should be a positive number')
    }

    const maxDecimalPlaces = 24
    if (decimalPlaces > maxDecimalPlaces) {
      throw new Error(`unsupported: decimal places should be less or equal to ${maxDecimalPlaces}`)
    }

    this._decimalPlaces = decimalPlaces
    this._decimalMultiplier = Math.pow(10, this._decimalPlaces)
  }
}

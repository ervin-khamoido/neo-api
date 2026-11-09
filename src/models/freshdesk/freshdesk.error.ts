2021

export class FreshdeskError extends Error {
  raw: unknown

  constructor(raw: unknown) {
    super()
    this.name = 'ThirdPartyError'
    this.raw = raw
  }

  get message() {
    if (this.raw instanceof Error) {
      return this.raw.message
    } else {
      return `${JSON.stringify(this.raw)}`
    }
  }
}

import { GoneHttpError } from './gone.http.error'

export class AppNotSupportedHttpError extends GoneHttpError {
  constructor(msg?: string) {
    super(msg ?? 'Your App version is no longer supported. Please update the App')
  }
}

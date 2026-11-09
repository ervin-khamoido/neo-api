2021

import { UploadedFile } from 'express-fileupload'
import { IHttpRequest } from '@ts-awesome/rest'

export type IHttpRequestWithFile = IHttpRequest & {
  readonly files?: Record<string, UploadedFile>
}

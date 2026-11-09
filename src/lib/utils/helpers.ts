import { IHttpRequest } from '@ts-awesome/rest'

function unique<T>(...args: Iterable<T | null | undefined>[]): T[] {
  return [
    ...new Set(args.reduce<T[]>((a, x) => [...a, ...([...x].filter((x: unknown) => x != null) as T[])], [] as T[])),
  ]
}

function getSubjectFromRequest(request: IHttpRequest): string {
  return (request.hostname === 'localhost' ? request.headers.host : request.hostname) || request.hostname || 'unknown'
}

function getRequesterIP(request: IHttpRequest): string | null {
  const ip = request.ip ?? request.socket?.remoteAddress

  return ip!
}

function requireFields<T extends object, TRequired extends keyof T>(
  obj: T,
  ...fields: TRequired[]
): Omit<T, TRequired> & Required<Pick<T, TRequired>> {
  if (!fields.every(x => obj.hasOwnProperty(x))) {
    throw new Error(`Fields are required: ${fields.join(',')}`)
  }

  return obj as any
}

function toTitleCase(word: string): string {
  const words = word.toLowerCase().split(' ')
  for (var i = 0; i < words.length; i++) {
    words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1)
  }
  return words.join(' ')
}

export default {
  unique,
  getSubjectFromRequest,
  getRequesterIP,
  requireFields,
  toTitleCase,
}

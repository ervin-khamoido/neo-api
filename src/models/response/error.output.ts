2021

export interface IErrorOutput<T> {
  error: string
  code: number
  name: string
  data?: T
}

2021

export interface ICreateNoteInput {
  body: string
  notify_emails?: string[]
  incoming?: boolean
  user_id?: number
  import_id?: number
  support_email?: object
  to_emails?: string[]

  // _private	Boolean		[optional]
}

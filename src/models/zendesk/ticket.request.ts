import { ITicketCommentRequest } from './ticket-comment.request'

export interface ITicketRequest {
  // Write only. The email address of the agent to assign the ticket to
  assignee_email?: string | null

  // The agent currently assigned to the ticket
  assignee_id?: number | null

  //An array of the IDs of attribute values to be associated with the ticket
  attribute_value_ids?: number[] | null

  // Enterprise only. The id of the brand this ticket is associated with
  brand_id?: number | null

  // The ids of users currently CC'ed on the ticket
  collaborator_ids?: number[] | null

  // example: [ 562, "someone@example.com", { "name": "Someone Else", "email": "else@example.com" } ]
  collaborators?: (number | string | object)[]

  // An object that adds a comment to the ticket
  comment: ITicketCommentRequest

  // Custom fields for the ticket
  custom_fields?: { id: number; value: string }[]

  // If this is a ticket of type "task" it has a due date
  due_at?: Date

  subject?: string
}

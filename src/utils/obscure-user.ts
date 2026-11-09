import { UserModel } from '../models/db'

export function obscureUser(user: UserModel): void {
  const slices = user.email.split('@')

  if (slices.length !== 2) {
    throw new Error('Email address is not valid')
  }

  let [username, domain] = slices

  if (username.length < 3) {
    username = username.slice(0, -1) + '*****'
  } else {
    username = username.slice(0, 2) + '*******'
  }

  user.email = `${username}@${domain}`
}

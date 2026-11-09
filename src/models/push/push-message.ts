export interface IPushMessage {
  title: string
  body: string
}

export interface IPushData {
  // according to firebase typing data has to contain string
  showOnForeground?: 'true' | 'false'
}

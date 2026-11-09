import { readable } from '@ts-awesome/model-reader'

export enum ReportType {
  Balance = 'balance_report',
}

export class ReportEventData {
  @readable type!: ReportType
  // @readable payload!: any
}

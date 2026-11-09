2021

import { readable } from '@ts-awesome/model-reader'

export class Address {
  @readable(String, true) country?: string | null
  @readable(String, true) postCode?: string | null
  @readable(String, true) town?: string | null
  @readable(String, true) street?: string | null
  @readable(String, true) subStreet?: string | null
  @readable(String, true) state?: string | null
}

export class FixedInfo {
  @readable(String, true) firstName?: string | null
  @readable(String, true) lastName?: string | null
  @readable(String, true) middleName?: string | null
  @readable(String, true) firstNameEn?: string | null
  @readable(String, true) lastNameEn?: string | null
  @readable(String, true) middleNameEn?: string | null
  @readable(String, true) legalName?: string | null
  @readable(String, true) gender?: string | null
  @readable(String, true) dob?: string | null
  @readable(String, true) placeOfBirth?: string | null
  @readable(String, true) country?: string | null
  @readable(String, true) nationality?: string | null
  @readable([Address], true) addresses?: Address[] | null
  @readable([Object], true) idDocs?: object[] | null
}

export class ApplicantDataResponse {
  @readable(String) id!: string // Applicant ID
  @readable(String) externalUserId!: string // Our internal user uid
  @readable(String) inspectionId!: string | null
  @readable(String, true) sourceKey?: string | null
  @readable(String, true) email?: string | null
  @readable(String, true) phone?: string | null
  @readable(String, true) lang?: string | null
  @readable(Object, true) metadata?: object | null
  @readable(FixedInfo) info!: FixedInfo
  @readable(FixedInfo, true) fixedInfo?: FixedInfo | null
  @readable(Date) createdAt!: Date
  @readable(Object, true) requiredIdDocs?: object | null
  @readable(Object) review!: object
  @readable([Object], true) questionnaires?: object[] | null
}

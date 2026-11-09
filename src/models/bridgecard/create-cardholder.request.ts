2023

import { readable } from '@ts-awesome/model-reader'

export class Address {
  @readable(String) address!: string
  @readable(String) city!: string
  @readable(String) state!: string
  @readable(String) country!: string
  @readable(String) postal_code!: string
  @readable(String) house_no!: string
}

export enum IdType {
  NigerianNin = 'NIGERIAN_NIN',
  NigerianInternationalPassport = 'NIGERIAN_INTERNATIONAL_PASSPORT',
  NigerianPVC = 'NIGERIAN_PVC', // PVC = permanent voters card
  NigerianDriversLicense = 'NIGERIAN_DRIVERS_LICENSE',
  NigerianBvnVerification = 'NIGERIAN_BVN_VERIFICATION',
}

export class Identity {
  @readable(String) id_type!: IdType
  @readable(String, true) id_no?: string
  @readable(String, true) id_image?: string
  @readable(String, true) selfie_image?: string
  @readable(String) bvn!: string
}

export interface ICardHolderMetadata {
  owner: string
}

export class CreateCardHolderRequest {
  @readable(String) first_name!: string
  @readable(String) last_name!: string
  @readable(Address) address!: Address
  @readable(String) phone!: string
  @readable(String) email_address!: string
  @readable(Identity) identity!: Identity
  @readable(Object) meta_data!: ICardHolderMetadata
}

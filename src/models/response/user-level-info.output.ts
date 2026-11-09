2021

import { OpenApiDataType, OpenApiSchema, OpenApiSchemaProperty } from '@ts-awesome/openapi'
import { readable } from '@ts-awesome/model-reader'

import { UserLevel, UserLevels } from '../db'
import { LevelStatus, LevelStatuses, StatusDetailsAction } from '../../services/level/user-level-info'
import { LevelOneRequirement, LevelOneRequirements } from '../../services/level/user-level-1-info'
import { LevelZeroRequirement, LevelZeroRequirements } from '../../services/level/user-level-0-info'

@OpenApiSchema({
  description: 'Requirement output model',
})
class RequirementOutput {
  @OpenApiSchemaProperty({
    description: 'Requirement code',
    enum: [...LevelZeroRequirements, ...LevelOneRequirements],
    readOnly: true,
  })
  @readable
  code!: LevelZeroRequirement | LevelOneRequirement

  @OpenApiSchemaProperty({
    description: 'Requirements description',
    readOnly: true,
  })
  @readable
  description!: string
}

@OpenApiSchema({
  description: 'Benefit output model',
})
class BenefitOutput {
  @OpenApiSchemaProperty({
    description: 'Benefit label',
    readOnly: true,
  })
  @readable
  label!: string

  @OpenApiSchemaProperty({
    description: 'Benefit raw value without formatting',
    readOnly: true,
  })
  @readable(Object, true)
  value!: number | string | boolean | null

  @OpenApiSchemaProperty({
    description: 'Benefit formatted value',
    readOnly: true,
  })
  @readable
  formattedValue!: string
}

@OpenApiSchema({
  description: 'Level Status Details Output',
})
class StatusDetailsOutput {
  @OpenApiSchemaProperty({
    description: 'Level Status Details Message',
    readOnly: true,
  })
  @readable
  message!: string

  @OpenApiSchemaProperty({
    description: 'Level Status Details Code',
    readOnly: true,
  })
  @readable
  code!: string

  @OpenApiSchemaProperty({
    description: 'Level Status Details Actions',
    type: OpenApiDataType.object,
    nullable: true,
    readOnly: true,
  })
  @readable(Object, true)
  actions?: Partial<Record<StatusDetailsAction, boolean>>
}

@OpenApiSchema({
  description: 'User level requirements output model',
})
export class UserLevelInfoOutput {
  @OpenApiSchemaProperty({
    description: 'User level order',
    readOnly: true,
  })
  @readable
  order!: number

  @OpenApiSchemaProperty({
    description: 'User level code',
    enum: UserLevels,
    readOnly: true,
  })
  @readable
  code!: UserLevel

  @OpenApiSchemaProperty({
    description: 'User level name',
    readOnly: true,
  })
  @readable
  name!: string

  @OpenApiSchemaProperty({
    description: 'User level requirements summary',
    readOnly: true,
  })
  @readable
  requirementsSummary!: string

  @OpenApiSchemaProperty({
    description: 'User level requirements',
    type: OpenApiDataType.array,
    items: RequirementOutput,
    readOnly: true,
  })
  @readable([RequirementOutput])
  requirements!: RequirementOutput[]

  @OpenApiSchemaProperty({
    description: 'User level remaining requirements',
    type: OpenApiDataType.array,
    items: RequirementOutput,
    readOnly: true,
  })
  @readable([RequirementOutput])
  remainingRequirements!: RequirementOutput[]

  @OpenApiSchemaProperty({
    description: 'User level benefits summary',
    readOnly: true,
  })
  @readable
  benefitsSummary!: string

  @OpenApiSchemaProperty({
    description: 'User level benefits',
    type: OpenApiDataType.array,
    items: BenefitOutput,
    readOnly: true,
  })
  @readable([BenefitOutput])
  benefits!: BenefitOutput[]

  @OpenApiSchemaProperty({
    description: 'User level status',
    enum: LevelStatuses,
    readOnly: true,
  })
  @readable
  status!: LevelStatus

  @OpenApiSchemaProperty({
    description: 'User level status',
    type: StatusDetailsOutput,
    nullable: true,
    readOnly: true,
  })
  @readable(StatusDetailsOutput, true)
  statusDetails?: StatusDetailsOutput | null
}

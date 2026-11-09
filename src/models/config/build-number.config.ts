import { injectable } from 'inversify'
import fs from 'fs'
import path from 'path'

const BUILD_NUMBER_FILE_PATH = path.join(__dirname, '../../build-number.json')

export interface IBuildNumberConfig {
  readonly buildId: string
  readonly project: string
  readonly version: string
  readonly buildNumber: string
  readonly buildHash: string
}

export const BuildNumberConfigSymbol = Symbol.for('IBuildNumberConfig')

@injectable()
export class BuildNumberConfig implements IBuildNumberConfig {
  readonly buildId: string
  readonly project: string
  readonly version: string
  readonly buildNumber: string
  readonly buildHash: string

  constructor(buildId: string, project: string, version: string, buildNumber: string, buildHash: string) {
    this.buildId = buildId
    this.project = project
    this.version = version
    this.buildNumber = buildNumber
    this.buildHash = buildHash
  }

  static init(): IBuildNumberConfig {
    try {
      fs.accessSync(BUILD_NUMBER_FILE_PATH, fs.constants.R_OK)

      const buildNumberResult = fs.readFileSync(BUILD_NUMBER_FILE_PATH)
      const buildNumberConfig: IBuildNumberConfig = JSON.parse(<any>buildNumberResult)

      return new BuildNumberConfig(
        buildNumberConfig.buildId,
        buildNumberConfig.project,
        buildNumberConfig.version,
        buildNumberConfig.buildNumber,
        buildNumberConfig.buildHash,
      )
    } catch (err: any) {
      return new BuildNumberConfig('', '', '', '', '')
    }
  }
}

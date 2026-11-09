2021

import { Route, httpGet } from '@ts-awesome/rest'
import { OpenApiPath, OpenApiOperationGet } from '@ts-awesome/openapi'

import { VersionOutput } from '../../models/response'
import { inject } from 'inversify'
import { BuildNumberConfigSymbol, IBuildNumberConfig } from '../../models/config/build-number.config'
import { IPushService, PushServiceSymbol } from '../../services/push.service'
import { IUserEntityService, UserEntityServiceSymbol } from '../../models/db'
import { PushEventData } from '../../microservice/push/model'

// ONLY FOR TESTING. DO NOT PUSH TO PRODUCTION
// OpenApiPath({
//   path: '/api/test',
//   tag: 'Testing',
// })

// @httpGet('/api/test/v1/queue')
export class TestQueue extends Route {
  @inject(BuildNumberConfigSymbol) buildNumberConfig!: IBuildNumberConfig
  @inject(PushServiceSymbol) pushService!: IPushService
  @inject(UserEntityServiceSymbol) userEntityService!: IUserEntityService

  static index = 1

  @OpenApiOperationGet({
    path: '/api/test/v1/queue',
    description: 'Tests Queue',
    summary: 'Tests Queue',
    responses: {
      200: { content: VersionOutput },
    },
  })
  public async handle(): Promise<void> {
    const [
      user1,
      // user2
    ] = await Promise.all([
      this.userEntityService.getOne({ phone: '+2341111111112' }),
      //this.userEntityService.getOne({ phone: '+2341111111117' }),
    ])

    //for (let index = 0; index < 50; index++) {
    const message1: PushEventData = {
      reason: '',
      userId: user1!.id,
      showOnForeground: true,
      payload: {
        title: `Test Queue #${TestQueue.index++} 🎉`,
        body: `Please let the queue work fine!`,
        version: 'v1',
      },
    }

    // const message2: PushEventData = {
    //   reason: '',
    //   userId: user2!.id,
    //   showOnForeground: true,
    //   payload: {
    //     title: `Test Queue #${index} 🎉`,
    //     body: `Please let the queue work fine!`,
    //     version: 'v1',
    //   },
    // }

    await this.pushService.scheduleSend(message1)
    //await this.pushService.scheduleSend(message2)

    //await this.sleep(100)
    //}

    this.empty()
  }
}

2021

import { Route, httpGet, StatusCode } from '@ts-awesome/rest'
import { OpenApiPath, OpenApiOperationGet } from '@ts-awesome/openapi'

import { desc } from '@ts-awesome/orm'
import { inject } from 'inversify'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { FeeEntityServiceSymbol, FeeModel, IFeeEntityService } from '../../models/db'
import { IKeyValueStorageService, KeyValueStorageServiceSymbol } from '../../lib/services/key-value-storage'
import { addSeconds } from 'date-fns'

const CACHE_KEY = 'HEALTH_CHECK_DATA'
const CACHE_TIMEOUT = 10 // seconds
const EXPIRES_AT_TIMEOUT = 30 // seconds

@httpGet('/api/v1/health-check')
export class HealthCheckRoute extends Route {
  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>
  @inject(FeeEntityServiceSymbol) feeEntityService!: IFeeEntityService
  @inject(KeyValueStorageServiceSymbol) keyValueStorageService!: IKeyValueStorageService

  private static EXPIRES_AT: Date | null = null

  @OpenApiOperationGet({
    path: '/api/v1/health-check',
    description: 'Get API health',
    summary: 'Get API health',
    responses: {
      204: {},
    },
  })
  public async handle(): Promise<void> {
    const makeCheck = !HealthCheckRoute.EXPIRES_AT || new Date() > HealthCheckRoute.EXPIRES_AT

    if (makeCheck) {
      // IMPORTANT NOTE: We need to set the EXPIRES_AT before the operation is finished
      // The reason is in a butst of calls that might appear at the same time.
      // For example: If we ran 10 queries in parallel then all of them would call the DB instead of 1 call and 9 skips.
      HealthCheckRoute.EXPIRES_AT = addSeconds(new Date(), EXPIRES_AT_TIMEOUT)
      try {
        await Promise.all([
          this.checkDB(),
          this.checkCache(),
          //
        ])
      } catch (err: any) {
        HealthCheckRoute.EXPIRES_AT = null
        throw err
      }
    }

    this.empty(StatusCode.NoContent)
  }

  private async checkDB(): Promise<void> {
    await this.uow.auto(async () => {
      await this.feeEntityService
        .select()
        .orderBy(x => [desc(x.createdAt)])
        .fetchOne(FeeModel)
    })
  }

  private async checkCache(): Promise<void> {
    await this.keyValueStorageService.set(CACHE_KEY, 'healthy', CACHE_TIMEOUT)
  }
}

OpenApiPath({
  path: '/api/v1/health-check',
  tag: 'Health',
})

import { PgDriver } from '@ts-awesome/orm-pg'
import { ISqlQuery } from '@ts-awesome/orm-pg/dist/interfaces'
import { IQueryData, TableMetaProvider } from '@ts-awesome/orm'
import { Pool } from 'pg'
import { IProfilingSession } from '@ts-awesome/profiler'

export class ProfilingPgDriver extends PgDriver {
  constructor(private profilingSession: IProfilingSession, private group: string, pool: Pool) {
    super(pool as never)
  }

  execute(query: ISqlQuery): Promise<ReadonlyArray<IQueryData>>
  execute(query: ISqlQuery, scalar: true): Promise<number>
  execute<X extends TableMetaProvider>(
    query: ISqlQuery,
    Model: X,
    sensitive?: boolean,
  ): Promise<ReadonlyArray<InstanceType<X>>>
  execute(query: ISqlQuery, ...args: unknown[]): Promise<unknown> {
    const metric = query.sql.replace(/[^a-z0-9]/gi, ' ')
    return this.profilingSession.auto(metric.substring(0, Math.min(40, metric.length)), this.group, () =>
      super.execute(query, ...(args as [])),
    )
  }
}

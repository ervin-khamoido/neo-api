import config from 'config'
import * as pg from 'pg'
import { Container } from 'inversify'

import { IBuildableQueryCompiler, IQueryDriver } from '@ts-awesome/orm'
import { ISqlQuery, PgCompiler, PgDriver } from '@ts-awesome/orm-pg'
import { Symbols as OrmSymbols } from '@ts-awesome/orm/dist/symbols'

let pool: pg.Pool | undefined

export function setup(container: Container) {
  const sqlConfig = config.get<pg.PoolConfig>('dbConfig')
  pool = new pg.Pool(sqlConfig)

  container.bind<IQueryDriver<ISqlQuery>>(OrmSymbols.SqlQueryDriver).toDynamicValue(() => new PgDriver(pool as any))
  container.bind<IBuildableQueryCompiler<ISqlQuery>>(OrmSymbols.SqlQueryBuilder).to(PgCompiler)
}

export async function tearDown() {
  await pool!.end()
}

export default { setup, tearDown }

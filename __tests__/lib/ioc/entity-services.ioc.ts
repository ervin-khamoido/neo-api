2021

import { Container } from 'inversify'

import { IBuildableQueryCompiler, IQueryDriver, TableMetaProvider } from '@ts-awesome/orm'
import { EntityService, IEntityService, IQueryExecutorProvider, IUnitOfWork, UnitOfWork } from '@ts-awesome/entity'
import { ISqlQuery } from '@ts-awesome/orm-pg'
import { Symbols as EntitySymbols } from '@ts-awesome/entity/dist/symbols'
import { Symbols as OrmSymbols } from '@ts-awesome/orm/dist/symbols'

function setup(container: Container, ...DBModels: Array<TableMetaProvider>): void {
  container
    .bind<IUnitOfWork<ISqlQuery>>(EntitySymbols.UnitOfWork)
    .toDynamicValue(({ container }) => {
      const driver = container.get<IQueryDriver<ISqlQuery>>(OrmSymbols.SqlQueryDriver)
      return new UnitOfWork<ISqlQuery>(driver)
    })
    .inSingletonScope()

  for (const DBModel of DBModels) {
    const executorProvider = container.get<IQueryExecutorProvider<ISqlQuery>>(EntitySymbols.UnitOfWork)
    const queryBuilder = container.get<IBuildableQueryCompiler<ISqlQuery>>(OrmSymbols.SqlQueryBuilder)

    container
      .bind<IEntityService<unknown, never, never, never>>(EntitySymbols.serviceFor(DBModel))
      .toConstantValue(new EntityService(DBModel, executorProvider, queryBuilder))
  }
}

export default { setup }

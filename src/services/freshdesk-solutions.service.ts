2021

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { inject, injectable, named } from 'inversify'
// @ts-ignore
import Freshdesk from '@freshworks/freshdesk'
import { HttpTransportSymbol, IHttpTransport } from '@ts-awesome/request'
import { ILogger, ILoggerFactory, LoggerFactorySymbol } from '@ts-awesome/logger'

import { FreshdeskError } from '../models/freshdesk'
import { ArticleOutput, CategoryOutput, FolderOutput } from '../models/freshdesk/solutions'

export interface IFreshdeskSolutionsService {
  getCategories(): Promise<CategoryOutput[]>
  getFolders(categoryId: number): Promise<FolderOutput[]>
  getArticles(folderId: number): Promise<ArticleOutput[]>
}

export const FreshdeskSolutionsServiceSymbol = Symbol.for('IFreshdeskSolutionsService')

@injectable()
export class FreshdeskSolutionsService implements IFreshdeskSolutionsService {
  private readonly logger: ILogger

  @named('freshdesk') @inject(HttpTransportSymbol) http!: IHttpTransport

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(FreshdeskSolutionsService)
  }

  async getCategories(): Promise<CategoryOutput[]> {
    try {
      return await this.http.get<CategoryOutput[]>('/api/v2/solutions/categories', { Model: [CategoryOutput] })
    } catch (err) {
      throw new FreshdeskError(err)
    }
  }

  async getFolders(categoryId: number): Promise<FolderOutput[]> {
    try {
      return await this.http.get<FolderOutput[]>(`/api/v2/solutions/categories/${categoryId}/folders`, {
        Model: [FolderOutput],
      })
    } catch (err) {
      throw new FreshdeskError(err)
    }
  }

  async getArticles(folderId: number): Promise<ArticleOutput[]> {
    try {
      return await this.http.get<ArticleOutput[]>(`/api/v2/solutions/folders/${folderId}/articles`, {
        Model: [ArticleOutput],
      })
    } catch (err) {
      throw new FreshdeskError(err)
    }
  }
}

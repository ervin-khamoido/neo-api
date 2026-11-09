2021

import { inject, injectable } from 'inversify'

import { cache, CacheKey } from '../utils/cache-util'
import { HelpCenterArticleOutput, HelpCenterCategoryOutput, HelpCenterFolderOutput } from '../models/response'

import { FreshdeskSolutionsServiceSymbol, IFreshdeskSolutionsService } from './freshdesk-solutions.service'
import { ArticleStatus } from '../models/freshdesk/solutions'
import { FreshdeskServiceSymbol, IFreshdeskService } from './freshdesk.service'
import { SupportInput } from '../models/request'
import { IUserDetailsEntityService, UserDetailsEntityServiceSymbol, UserModel } from '../models/db'
import { FreshdeskTicketPriority, FreshdeskTicketStatus } from '../models/freshdesk'

export interface ISupportService {
  getHelpCenter(): Promise<HelpCenterCategoryOutput[]>
  createTicket(user: UserModel, payload: SupportInput): Promise<void>
}

export const SupportServiceSymbol = Symbol.for('ISupportService')

@injectable()
export class SupportService implements ISupportService {
  @inject(FreshdeskServiceSymbol) freshdeskService!: IFreshdeskService
  @inject(FreshdeskSolutionsServiceSymbol) freshdeskSolutionsService!: IFreshdeskSolutionsService
  @inject(UserDetailsEntityServiceSymbol) userDetailsService!: IUserDetailsEntityService

  @cache(CacheKey.HelpCenter)
  async getHelpCenter(): Promise<HelpCenterCategoryOutput[]> {
    const categories = await this.freshdeskSolutionsService.getCategories()

    const categoryOutputsPromises = categories.map(async x => {
      const folders = await this.freshdeskSolutionsService.getFolders(x.id)

      const folderOutputsPromises = folders.map(async y => {
        const articles = await this.freshdeskSolutionsService.getArticles(y.id)
        const articleOutputs = articles
          .filter(x => x.status === ArticleStatus.Published)
          .map(
            z =>
              ({
                id: `${z.id}`,
                title: z.title,
                description: this.formatDescriptionText(z.descriptionText),
                thumbsUp: z.thumbsUp,
                thumbsDown: z.thumbsDown,
              } as HelpCenterArticleOutput),
          )

        return {
          id: `${y.id}`,
          name: y.name,
          articles: articleOutputs,
        } as HelpCenterFolderOutput
      })

      return {
        id: `${x.id}`,
        name: x.name,
        folders: await Promise.all(folderOutputsPromises),
      } as HelpCenterCategoryOutput
    })

    return Promise.all(categoryOutputsPromises)
  }

  async createTicket(user: UserModel, payload: SupportInput): Promise<void> {
    const userDetails = await this.userDetailsService.getOne({ userId: user.id })

    if (!userDetails) {
      return
    }

    await this.freshdeskService.createSupportTicket({
      name: userDetails?.fullName,
      subject: payload.issue,
      description: payload.description,
      email: userDetails.email,
      status: FreshdeskTicketStatus.Open,
      priority: FreshdeskTicketPriority.Medium,
    })
  }

  private formatDescriptionText(value: string) {
    return value
      .replace(/\s{3}/gi, '\n')
      .split('\n')
      .map(x => x.trim())
      .join('\n')
  }
}

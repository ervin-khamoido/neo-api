2021

import { injectable, inject } from 'inversify'
import { LoggerFactorySymbol, ILoggerFactory, ILogger } from '@ts-awesome/logger'

import fs from 'fs'
import path from 'path'

import { cache, CacheKey } from '../../utils/cache-util'

import { MailTemplates } from './mailgun.service'
import { IMailTemplate } from '../../lib/services/mailer/mailer.service'

export interface IMailTemplateService {
  generateFormattedHtml(template: IMailTemplate): Promise<string>
}

export const MailTemplateServiceSymbol = Symbol.for('IMailTemplateService')

const TEMPLATES_DIR_PATH = path.join(__dirname, '/templates/')
const TEMPLATES_CONDITIONAL_CONTENT_DIR_PATH = path.join(__dirname, '/templates/conditional-content')
const CHARSET = 'utf-8'

@injectable()
export class MailTemplateService implements IMailTemplateService {
  private readonly logger: ILogger

  constructor(@inject(LoggerFactorySymbol) loggerFactory: ILoggerFactory) {
    this.logger = loggerFactory(MailTemplateService)
  }

  public async generateFormattedHtml(template: IMailTemplate): Promise<string> {
    const { name, variables, conditionalContent } = template

    const emailTemplate = await this.getTemplate(name)
    if (!emailTemplate) {
      throw new Error(`unexpected: Could not find ${template.name} email template`)
    }

    // Go through the conditional variables and add the html content where the values are true
    for (const key in conditionalContent) {
      const contentName = key.replace(/_/g, '-')
      const variableName = key + '_html'

      // If the key value is true, grab the html if it exists, otherwise just send an empty string
      if (conditionalContent[key]) {
        const content = emailTemplate.conditionalContent.find(x => x.name == contentName)
        const htmlContent = content
          ? content.html.replace(/{{(.+?)}}/g, (match, tag) => variables[tag.trim()]?.toString())
          : ''
        template.variables[variableName] = htmlContent
      } else {
        template.variables[variableName] = ''
      }
    }

    return emailTemplate.html.replace(/{{(.+?)}}/g, (match, tag) => variables[tag.trim()]?.toString())
  }

  private async getTemplate(template: MailTemplates): Promise<EmailTemplate | null> {
    const templates = await this.getTemplates()

    return templates[template]
  }

  @cache(CacheKey.MailTemplates)
  private async getTemplates(): Promise<Record<string, EmailTemplate>> {
    const templates: Record<string, EmailTemplate> = {}

    const files = fs.readdirSync(TEMPLATES_DIR_PATH, { withFileTypes: true })
    if (!files) {
      throw new Error(`unexpected: No files found in directory: ${TEMPLATES_DIR_PATH}`)
    }

    files.forEach(async file => {
      if (!file.isFile()) return
      const templateName = file.name.split('.')[0]
      const filePath = path.join(TEMPLATES_DIR_PATH, file.name)
      const html = fs.readFileSync(filePath, CHARSET)
      const conditionalContent = await this.getTemplateConditionalContent(<MailTemplates>templateName)

      templates[templateName] = {
        file: file.name,
        filePath: filePath,
        html: html,
        template: <MailTemplates>templateName,
        conditionalContent: conditionalContent,
      }
    })

    return templates
  }

  private async getTemplateConditionalContent(templateName: MailTemplates): Promise<TemplateConditionalContent[]> {
    // check for conditional content
    const contentFileDirPath = TEMPLATES_CONDITIONAL_CONTENT_DIR_PATH + `/${templateName}`
    const contentDirPathExists = fs.existsSync(contentFileDirPath)
    if (!contentDirPathExists) {
      return []
    }

    const templateContents: TemplateConditionalContent[] = []
    const contentFiles = fs.readdirSync(contentFileDirPath)
    if (contentFiles) {
      contentFiles.forEach(contentFile => {
        const contentName = contentFile.split('.')[0]
        const contentFilePath = path.join(contentFileDirPath, contentFile)
        const contentHtml = fs.readFileSync(contentFilePath, CHARSET)

        templateContents.push({
          name: contentName,
          file: contentFile,
          filePath: contentFilePath,
          html: contentHtml,
        })
      })
    }

    return templateContents
  }
}

class EmailTemplate {
  file!: string
  filePath!: string
  html!: string
  template!: MailTemplates
  conditionalContent!: TemplateConditionalContent[]
}

class TemplateConditionalContent {
  name!: string
  file!: string
  filePath!: string
  html!: string
}

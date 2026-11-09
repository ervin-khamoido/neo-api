import 'reflect-metadata'

import * as bodyParser from 'body-parser'
import express, { Application } from 'express'
import { Server } from 'http'
import cors from 'cors'
import compression from 'compression'
import { Container } from 'inversify'
import { IConfig } from 'config'
import fbAdmin from 'firebase-admin'

import useRestServer from '@ts-awesome/rest'
import { openApi, OpenApiHttpSecurityScheme } from '@ts-awesome/openapi'
import { ConfigSymbol, ILogger, LoggerFactorySymbol } from '@ts-awesome/logger'

import ioc from './ioc'
import { ILoggerFactory } from '@ts-awesome/logger/dist/interfaces'
import { OpenApiParameterLocation } from '@ts-awesome/openapi/src/openapi/enums'

import { TOKEN_HEADER_NAME as OperatiosnTokenHeaderName } from './middleware/access/operations-access.middleware'
import { TOKEN_HEADER_NAME as ConfigurationTokenHeaderName } from './middleware/access/configuration-access.middleware'
import { TOKEN_HEADER_NAME as WebhookTokenHeaderName } from './middleware/access/webhook-access.middleware'
import { TOKEN_HEADER_NAME as PinTokenHeaderName } from './middleware/access/pin-access.middleware'
import { TOKEN_HEADER_NAME as DashboardTokenHeaderName } from './middleware/access/dashboard-access.middleware'
import { FORWARDED_FOR_TOKEN_HEADER_NAME as BridgeCardForwardedForTokenHeaderName } from './middleware/access/bridgecard-webhook-access.middleware'
import { WEBHOOK_SIGNATURE_TOKEN_HEADER_NAME as BridgeCardWebhookSignatureTokenHeaderName } from './middleware/access/bridgecard-webhook-access.middleware'
import { FeatureConfigSymbol, IFeatureConfig } from './models/config/feature.config'
import { OneTimeTokenHeaderName } from './middleware'
import { IKeyValueStorageService, KeyValueStorageServiceSymbol } from './lib/services/key-value-storage'
import { CacheConfigSymbol, ICacheConfig } from './models/config/cache.config'
import cacheUtil from './utils/cache-util'

export class ApplicationServer {
  private expApp: Application
  private server?: Server
  private readonly port: number = 3000

  private logger: ILogger

  constructor(container: Container) {
    const serviceAccount = JSON.parse(process.env.FIREBASE as any)
    fbAdmin.initializeApp({
      credential: fbAdmin.credential.cert(serviceAccount),
    })

    this.expApp = this.createExpressApplication(container)
    const config = container.get<IConfig>(ConfigSymbol)

    const loggerFactory = container.get<ILoggerFactory>(LoggerFactorySymbol)
    this.logger = loggerFactory('ApplicationServer')

    if (config.has('port')) {
      this.port = config.get('port')
    }

    const keyValueStorage = container.get<IKeyValueStorageService>(KeyValueStorageServiceSymbol)
    const cacheConfig = container.get<ICacheConfig>(CacheConfigSymbol)

    cacheUtil.initialize(cacheConfig, keyValueStorage, loggerFactory)
  }

  public start(): Promise<void> {
    return new Promise(done => {
      const host = '0.0.0.0'
      this.server = this.expApp.listen(this.port, host, () => {
        this.logger.info(`Server is listening ${host}:${this.port}`)
        this.logger.info(`Open API: http://${host}:${this.port}/api-docs/openapi/`)
        if (this.server) {
          // disable these timeouts to avoid race conditions in Elastic Beanstalk Load Balancer
          this.server.keepAliveTimeout = 0
          this.server.headersTimeout = 0
        }
        done()
      })
    })
  }

  public async stop(): Promise<void> {
    if (!this.server) {
      throw new Error('Server is already stopped')
    }

    this.logger.info('Server is stopping...')

    await new Promise<void>((res, rej) => this.server?.close(err => (err ? rej(err) : res())))

    this.logger.info('Server is stopped.')
  }

  private createExpressApplication(container: Container): express.Application {
    const app: Application = express()

    app.disable('x-powered-by')

    app.use(cors())
    app.use(compression())
    app.use(bodyParser.json())

    const featureConfig = container.get<IFeatureConfig>(FeatureConfigSymbol)
    if (featureConfig.swagger) {
      this.bindOpenApi(app)
    }

    app.use(useRestServer(container, ioc.setupRequestContainer))

    return app
  }

  private bindOpenApi(app: Application) {
    app.use(
      openApi({
        def: {
          info: {
            title: 'Neo Bank API',
            version: '1.0',
          },
          components: {
            securitySchemes: {
              BearerAuth: {
                type: 'http',
                scheme: OpenApiHttpSecurityScheme.bearer,
                bearerFormat: 'JWT',
              },
              FireToken: {
                type: 'apiKey',
                in: OpenApiParameterLocation.header,
                name: 'Authorization',
              },
              ConfigurationToken: {
                type: 'apiKey',
                in: OpenApiParameterLocation.header,
                name: ConfigurationTokenHeaderName,
              },
              OperationsToken: {
                type: 'apiKey',
                in: OpenApiParameterLocation.header,
                name: OperatiosnTokenHeaderName,
              },
              WebhookToken: {
                type: 'apiKey',
                in: OpenApiParameterLocation.header,
                name: WebhookTokenHeaderName,
              },
              PinToken: {
                type: 'apiKey',
                in: OpenApiParameterLocation.header,
                name: PinTokenHeaderName,
              },
              OneTimeToken: {
                type: 'apiKey',
                in: OpenApiParameterLocation.header,
                name: OneTimeTokenHeaderName,
              },
              DashboardToken: {
                type: 'apiKey',
                in: OpenApiParameterLocation.header,
                name: DashboardTokenHeaderName,
              },
              BridgeCardForwardedForToken: {
                type: 'apiKey',
                in: OpenApiParameterLocation.header,
                name: BridgeCardForwardedForTokenHeaderName,
              },
              BridgeCardWebhookSignatureToken: {
                type: 'apiKey',
                in: OpenApiParameterLocation.header,
                name: BridgeCardWebhookSignatureTokenHeaderName,
              },
            },
          },
        },
      }),
    )
  }
}

2021

import { inject } from 'inversify'

import { BadRequestError, httpPost, requestBody, Route, StatusCode } from '@ts-awesome/rest'
import { OpenApiOperationPost } from '@ts-awesome/openapi'
import { IValidator } from '@ts-awesome/validate'
import { IUnitOfWork, UnitOfWorkSymbol } from '@ts-awesome/entity'
import { and, or } from '@ts-awesome/orm'

import { CurrentUserSymbol } from '../../../middleware'
import { ISMSService, SMSServiceSymbol } from '../../../services/sms'
import { IMailerService, MailerServiceSymbol } from '../../../lib/services/mailer'

import {
  IInvitationEntityService,
  InvitationEntityServiceSymbol,
  InvitationModel,
  IUserDetailsEntityService,
  UserDetailsEntityServiceSymbol,
  UserModel,
} from '../../../models/db'
import { PostEntityOutput } from '../../../models/response'
import { InviteInput } from '../../../models/request'

import validation from '../../../lib/utils/validation'
import { BranchIOServiceSymbol, IBranchIOService } from '../../../services/branch.service'
import { FireAccessMiddleware } from '../../../middleware/access/fire-access.middleware'
import { PinAccessMiddleware } from '../../../middleware/access/pin-access.middleware'
import { MailTemplates } from '../../../services/mailer/mailgun.service'

@httpPost('/api/v1/user/invite', FireAccessMiddleware(), PinAccessMiddleware)
export class PostUserInviteRoute extends Route {
  @inject(CurrentUserSymbol) user!: UserModel

  @inject(InvitationEntityServiceSymbol) invitationService!: IInvitationEntityService
  @inject(SMSServiceSymbol) smsService!: ISMSService
  @inject(MailerServiceSymbol) mailerService!: IMailerService
  @inject(UserDetailsEntityServiceSymbol) userDetailsService!: IUserDetailsEntityService

  @inject(BranchIOServiceSymbol) branchIOService!: IBranchIOService

  @inject(UnitOfWorkSymbol) uow!: IUnitOfWork<void>

  @inject(validation.symbolFor(InviteInput))
  bodyValidator!: IValidator<InviteInput>

  @OpenApiOperationPost({
    path: '/api/v1/user/invite',
    description: 'Invite user by email or phone',
    summary: "GET user's info",
    security: [{ FireToken: [], PinToken: [] }],
    request: {
      body: {
        required: true,
        schema: InviteInput,
      },
    },
    responses: {
      [StatusCode.Success]: { description: 'Invitation UID', content: PostEntityOutput },
      [StatusCode.Created]: { description: 'New invitation UID', content: PostEntityOutput },
      [StatusCode.BadRequest]: { description: 'Invalid body, see errors' },
      [StatusCode.Unauthorized]: { description: 'Authorization with token failed or token expired' },
    },
  })
  public async handle(@requestBody(InviteInput) body: InviteInput): Promise<void> {
    if ((!body.email && !body.phone) || (body.email && body.phone)) {
      throw new BadRequestError('Either email or phone must be provided')
    }

    this.validate(this.bodyValidator, body, 'Errors: ')

    const [invitation, exists] = await this.uow.auto(() => this.create(body))

    if (body.phone) {
      await this.smsService.send(
        body.phone,
        `You were invited to join Neobank. Tap the link to register: ${invitation.link}`,
      )
    } else if (body.email) {
      await this.mailerService.send({
        subject: 'Neobank Invitation',
        to: body.email,
        template: {
          name: MailTemplates.Invitation,
          variables: {
            invitation_link: invitation.link,
          },
          conditionalContent: {},
        },
      })
    }

    return this.json({ uid: invitation.uid }, exists ? StatusCode.Success : StatusCode.Created, PostEntityOutput)
  }

  private async create(body: InviteInput): Promise<[InvitationModel, boolean]> {
    const userDetails = await this.userDetailsService.getOne({ userId: this.user.id })

    const { url: deepLink } = await this.branchIOService.link({
      data: {
        referrerCode: userDetails!.referrerCode,
        email: body.email ?? null,
        phone: body.phone ?? null,
      },
    })

    let invitation = await this.invitationService.getOne(x =>
      and(
        x.createdById.eq(this.user.id),
        or(
          x.email.eq(body.email ?? null),
          x.phone.eq(body.phone ?? null),
          //
        ),
        //
      ),
    )
    if (!invitation) {
      invitation = await this.invitationService.addOne({
        link: deepLink,
        createdById: this.user.id,
        phone: body.phone ?? null,
        email: body.email ?? null,
      })

      return [invitation, false]
    } else {
      return [invitation, true]
    }
  }
}

import utils from '../../../../src/lib/utils/helpers'
import { IHttpRequest } from '@ts-awesome/rest'

describe('helpers', () => {
  describe('toTitleCase()', () => {
    test('To titlecase all lowercase', () => {
      let checkText = 'to title case'

      let titleCaseTest = utils.toTitleCase(checkText)

      expect(titleCaseTest).toStrictEqual('To Title Case')
    })
    // TODO: Sounds like we need to include `-` as a separator.
    // to title-case -> To Title-Case
    // but it does not work like that right now
    test('To titlecase with dash', () => {
      let checkText = 'to another title-Case'

      let titleCaseTest = utils.toTitleCase(checkText)

      expect(titleCaseTest).toStrictEqual('To Another Title-case')
    })
    ;[' ', '    ', ''].forEach(str => {
      test(`To titlecase empty string test "${str}"`, () => {
        let titleCaseTest = utils.toTitleCase(str).trim()

        expect(titleCaseTest).toStrictEqual('')
        expect(titleCaseTest).not.toBeNull()
        expect(titleCaseTest).not.toBeUndefined()
      })
    })

    test('To titlecase from camel', () => {
      let checkText = 'test a camelCase'
      let titleCaseTest = utils.toTitleCase(checkText)

      expect(titleCaseTest).toStrictEqual('Test A Camelcase')
    })
  })

  describe('getRequesterIP()', () => {
    test('Get Requester Ip', () => {
      const request = {
        ip: '192.168.1.1',
        hostname: 'localhost',
        headers: {
          host: 'localhost',
        },
      } as IHttpRequest

      let ip = utils.getRequesterIP(request)

      expect(ip).toStrictEqual('192.168.1.1')
    })
  })

  describe('getSubjectFromRequest()', () => {
    test('Get Requesters hostname when localhost', () => {
      const request = {
        ip: '192.168.1.1',
        hostname: 'localhost',
        headers: {
          host: 'localhost',
        },
      } as IHttpRequest

      let hostname = utils.getSubjectFromRequest(request)

      expect(hostname).toStrictEqual('localhost')
    })
    test('Get Requesters hostname when not localhost', () => {
      const request = {
        ip: '192.168.1.1',
        hostname: 'hostnameSubject',
        headers: {
          host: 'test1',
        },
      } as IHttpRequest

      let hostname = utils.getSubjectFromRequest(request)

      expect(hostname).toStrictEqual('hostnameSubject')
    })
  })
})

import { UserFullNameService } from '../../../src/services/user-full-name.service'
import { NoopLoggerFactory } from '../logger.mock'

describe('UserFullNameService', () => {
  const loggerFactory = NoopLoggerFactory
  const service = new UserFullNameService(loggerFactory)

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('match()', () => {
    ;[
      { i: { existing: 'Anna Bond', new: 'Anna Bond' }, r: true },
      { i: { existing: 'Anna Bond', new: 'Bond Anna' }, r: true },
      { i: { existing: 'Anna Key Bond', new: 'Anna Key Bond' }, r: true },
      { i: { existing: 'Anna Key Bond', new: 'Key Anna Bond' }, r: true },
      { i: { existing: 'Anna Key Bond', new: 'Bond Key Anna' }, r: true },
      { i: { existing: 'Anna Key Bond', new: 'Anna K Bond' }, r: true },
      { i: { existing: 'Anna Key Bondy', new: 'Anna Key Bond' }, r: false },
      { i: { existing: 'Starter Kit', new: 'Anna Bond' }, r: false },
      { i: { existing: 'Anna Button Bond', new: 'Anna Key Bond' }, r: false },
      { i: { existing: 'Anna Bond', new: 'Anna Key Bond' }, r: true },
      { i: { existing: 'Key Bond', new: 'Anna Key Bond' }, r: true },
      { i: { existing: 'Anna Bond', new: 'Anna K Bond' }, r: true },
      { i: { existing: 'Anna Key Bond', new: 'Bond Key J Anna' }, r: true },
      { i: { existing: 'Onomo Onomo Onomo', new: 'Onomo Okon O' }, r: false },
      { i: { existing: 'Onomo Okon O', new: 'Onomo Onomo Onomo' }, r: false },
    ].forEach(t => {
      test(`should match=${t.r} in all single case scenarios. '${t.i.existing}' - '${t.i.new}'`, async () => {
        const match = service.match(t.i.existing, t.i.new)

        expect(match.match).toEqual(t.r)
      })
    })

    describe('should match', () => {
      ;[
        { i: { existing: 'Anna', new: 'Anna' } },
        { i: { existing: 'Anna Bond', new: 'Bond Anna' } },
        { i: { existing: 'Bond Anna', new: 'Bond Anna' } },
        { i: { existing: 'anna bond', new: 'Anna Bond' } },
        { i: { existing: 'anna bond', new: 'Anna  Bond' } },
        { i: { existing: 'anna bond', new: 'Anna  Bond  ' } },
        { i: { existing: 'Anna Jay Bond', new: ' Bond Jay Anna' } },
        { i: { existing: 'anna jay bond', new: 'Anna  Jay Bond' } },
        { i: { existing: 'jay anna bond', new: 'Anna Jay  Bond' } },
        { i: { existing: 'jay anna bond', new: 'Anna Bond Jay ' } },
        { i: { existing: 'bond jay anna', new: 'Anna Bond Jay    ' } },
        { i: { existing: 'bond jay-second anna', new: 'Anna Bond Jay-second' } },
        { i: { existing: 'Onomo Okon Onomo', new: 'ONOMO OKON O' } },
        { i: { existing: 'Onomo Onomo Akin', new: 'ONOMO ONOMO A' } },
        { i: { existing: 'Onomo Onomo Akin', new: 'ONOMO AKIN O' } },
        { i: { existing: 'Onomo Onomo Onomo', new: 'ONOMO ONOMO ONOMO' } },
        { i: { existing: 'Onomo Onomo Onomo', new: 'ONOMO ONOMO O' } },
      ].forEach(t => {
        test(`when both have same amount of words. '${t.i.existing}' - '${t.i.new}'`, async () => {
          const match = service.match(t.i.existing, t.i.new)

          expect(match.match).toEqual(true)
        })
      })
      ;[
        { i: { existing: 'Anna Jay Bond', new: 'Bond Anna' } },
        { i: { existing: 'anna jay bond two', new: 'Anna Jay Bond' } },
        { i: { existing: 'jay anna bond two three', new: 'Anna Jay Bond three' } },
        { i: { existing: 'jay anna bond two-four three', new: 'Anna Jay Bond three' } },
        { i: { new: 'Anna Jay Bond', existing: 'Bond Anna' } },
        { i: { new: 'anna jay bond two', existing: 'Anna Jay Bond' } },
        { i: { new: 'jay anna bond two three', existing: 'Anna Jay Bond three' } },
        { i: { new: 'jay anna bond two-four three', existing: 'Anna Jay Bond three' } },
      ].forEach(t => {
        test(`when both have different amount of words. '${t.i.existing}' - '${t.i.new}'`, async () => {
          const match = service.match(t.i.existing, t.i.new)

          expect(match.match).toEqual(true)
        })
      })
      ;[
        { i: { existing: 'Anna,, Jay Bond', new: ',Bond Anna' } },
        { i: { existing: 'anna jay , bond', new: 'Anna Jay Bond' } },
        { i: { existing: 'anna jay, bond', new: 'Anna Jay Bond,' } },
        { i: { existing: 'Anna.. Jay Bond', new: '.Bond Anna' } },
        { i: { existing: 'anna jay . bond', new: 'Anna Jay Bond' } },
        { i: { existing: 'anna jay. bond', new: 'Anna Jay Bond.' } },
      ].forEach(t => {
        test(`when comma and dot exists. '${t.i.existing}' - '${t.i.new}'`, async () => {
          const match = service.match(t.i.existing, t.i.new)

          expect(match.match).toEqual(true)
        })
      })
      ;[
        { i: { existing: 'Anna J Bond', new: 'Bond Jay Anna' } },
        { i: { new: 'Anna J Bond', existing: 'Bond Jay Anna' } },
        { i: { existing: 'A Jay Bond', new: 'Bond Jay Anna' } },
        { i: { new: 'A Jay Bond', existing: 'Bond Jay Anna' } },
        { i: { existing: 'Anna Jay B', new: 'Bond Jay Anna' } },
        { i: { new: 'Anna Jay B', existing: 'Bond Jay Anna' } },
        { i: { existing: 'Abumere Omoyeme A', new: 'Abumere Omoyeme Ayodeji' } },
        { i: { new: 'Abumere Omoyeme A', existing: 'Abumere Omoyeme Ayodeji' } },
        { i: { existing: 'Abumere Aalaman A', new: 'Aalaman Abumere Ayodeji' } },
        { i: { new: 'Abumere Aalaman A', existing: 'Aalaman Abumere Ayodeji' } },
        { i: { existing: 'Ayodeji Aalaman A', new: 'Aalaman Abumere Ayodeji' } },
        { i: { new: 'Ayodeji Aalaman A', existing: 'Aalaman Abumere Ayodeji' } },
      ].forEach(t => {
        test(`when one of the words is one letter. '${t.i.existing}' - '${t.i.new}'`, async () => {
          const match = service.match(t.i.existing, t.i.new)

          expect(match.match).toEqual(true)
        })
      })
    })

    describe('should not match', () => {
      ;[{ i: { existing: 'Anna Bond', new: 'Anna' } }, { i: { existing: 'Anna', new: 'Anna Bond' } }].forEach(t => {
        test(`when new consists of one word. '${t.i.existing}' - '${t.i.new}'`, async () => {
          const match = service.match(t.i.existing, t.i.new)

          expect(match.match).toEqual(false)
        })
      })
      ;[
        { i: { existing: 'Anna Anna', new: 'Anna Bond' } },
        { i: { existing: 'One Two', new: 'Three Two' } },
        { i: { existing: 'One Two Three', new: 'Three Two Four' } },
      ].forEach(t => {
        test(`when both have same amount of words. '${t.i.existing}' - '${t.i.new}'`, async () => {
          const match = service.match(t.i.existing, t.i.new)

          expect(match.match).toEqual(false)
        })
      })
      ;[
        { i: { existing: 'Anna I Bond', new: 'Bond Jay Anna' } },
        { i: { existing: 'Anna Ja Bond', new: 'Bond Jay Anna' } },
        { i: { existing: 'I Jay Bond', new: 'Bond Jay Anna' } },
        { i: { existing: 'Anna Jay I', new: 'Bond Jay Anna' } },
        { i: { new: 'Anna I Bond', existing: 'Bond Jay Anna' } },
        { i: { new: 'V Jay Bond', existing: 'Bond Jay Anna' } },
        { i: { new: 'Anna Jay A', existing: 'Bond Jay Anna' } },
        { i: { new: 'Anna Jay', existing: 'J Anna' } },
        { i: { existing: 'Anna Jay', new: 'J Anna' } },
        { i: { new: 'Anna Jay', existing: 'J Anna' } },
        { i: { new: 'Onomo Onomo Akin', existing: 'ONOMO Onomo O' } },
        { i: { new: 'Onomo Onomo', existing: 'ONOMO O' } },
        { i: { new: 'Onomo O', existing: 'ONOMO ONOMO' } },
      ].forEach(t => {
        test(`when one of the words is one letter. '${t.i.existing}' - '${t.i.new}'`, async () => {
          const match = service.match(t.i.existing, t.i.new)

          expect(match.match).toEqual(false)
        })
      })
      ;[
        { i: { existing: 'Anna Anna Anna', new: 'Anna Bond' } },
        { i: { existing: 'Anna Bond', new: 'Anna Anna Anna' } },
        { i: { existing: 'Anna Bond Jay', new: 'Anna Anna' } },
        { i: { existing: 'Anna Anna', new: 'Anna Bond Jay' } },
        { i: { existing: 'Anna B J C', new: 'Anna B' } },
        { i: { existing: 'Anna B J C D', new: 'Anna B J' } },
        { i: { existing: 'Anna B-J C D', new: 'Anna B-J' } },
        { i: { existing: 'Onomo ONOMO ONOMO ONOMO', new: 'ONOMO ONOMO' } },
        { i: { new: 'Onomo ONOMO ONOMO ONOMO', existing: 'ONOMO ONOMO' } },
      ].forEach(t => {
        test(`when both have different amount of words. '${t.i.existing}' - '${t.i.new}'`, async () => {
          const match = service.match(t.i.existing, t.i.new)

          expect(match.match).toEqual(false)
        })
      })
    })
  })
})

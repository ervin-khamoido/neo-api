import { Container } from 'inversify'
import { setup as setupLogger } from '@ts-awesome/logger/dist/utils'

function setup(container: Container) {
  setupLogger(container)
}

export default { setup }

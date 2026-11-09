const { default: startup, referralRewardService, logger } = require('../dist/microservice/referral-reward/index.js')

startup()

// PM2 sends IPC message for graceful shutdown
process.on('message', async function onProcessMessage(msg) {
  try {
    if (msg === 'shutdown') {
      await referralRewardService.stop()
      process.exit(0)
    }
  } catch (err) {
    logger.warn(err instanceof Error ? err.message : `${err}`)
    process.exit(1)
  }
})

// ctrl+c or kill $pid
process.on('SIGINT', async function onProcessSigInt() {
  await referralRewardService.stop()
  process.exit(0)
})
process.on('SIGTERM', async function onProcessSigTerm() {
  await referralRewardService.stop()
  process.exit(0)
})

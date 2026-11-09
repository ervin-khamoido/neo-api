module.exports = {
  apps: [
    {
      name: 'api',
      script: './index.js',
      instances: -1,
      exec_mode: 'cluster',
    },
    {
      name: 'microservice:referral-reward',
      script: './ecosystem-microservices/referral-reward.microservice.js',
      instances: 1,
      exec_mode: 'cluster',
    },
    {
      name: 'microservice:push',
      script: './ecosystem-microservices/push.microservice.js',
      instances: 1,
      exec_mode: 'cluster',
    },
    {
      name: 'microservice:receive-money',
      script: './ecosystem-microservices/receive-money.microservice.js',
      instances: 1,
      exec_mode: 'cluster',
    },
    {
      name: 'microservice:reporting',
      script: './ecosystem-microservices/reporting.microservice.js',
      instances: 1,
      exec_mode: 'cluster',
    },
  ],
}

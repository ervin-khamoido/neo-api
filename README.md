# neo-bank/api

## Environment

1. Install Doppler and authenticate: https://docs.doppler.com/docs/cli#installation
    - Go look at inctructions in doppler.yaml.example
    

2. Create `server.sh` file:

```shell
G_CREDS=$(doppler secrets get GOOGLE_APPLICATION_CREDENTIALS --plain)

doppler secrets get GOOGLE_APPLICATION_CREDENTIALS_JSON --plain > $G_CREDS
doppler run --command="npm run dev"
```

3. Run `sh server.sh` in bash.

## Tests

#### To run the tests you have to set up a test database.

1. In the db project add your configurations in `.env` file e.g.

```dotenv
TEST_POSTGRES_USER=postgres
TEST_POSTGRES_PASSWORD=1234
TEST_MIGRATIONS_HOST=localhost
TEST_MIGRATIONS_PORT=5432
```

2. Run a command in the db project to create a test database `neo-bank-test`:

```shell
npm run test:db:create
```

3. To drop the test database `neo-bank-test` use:

```shell
npm run test:db:drop
```

4. Run a command in the db project to run all migrations:

```shell
npm run test:up
```

#### When database is created, create `test.sh` script using `test.sample.sh` as template and set environment variables.

To run all tests use:

```shell
sh test.sh
```


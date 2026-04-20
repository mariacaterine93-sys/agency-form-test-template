# Playwright E2E Tests

## Setup
1. Install Node.js
2. Install dependencies in this folder
3. Copy .env.example to .env
4. Run the tests in headed or UI mode

## Test Execution with GitHub Workflow
The YAML pipeline example is configured for a nightly run in `.github/workflows/nightly-run.yml`. The E2E test runs every midnight, and the result is published to the queue.

### Write end to end tests
We utilize Playwright with TypeScript and Object Models.

1. Create a Page Object Class: In the `src/pages` directory, create a file for your page object. For instance, if you are testing a login page, name it `LoginPage.page.ts`.
2. Develop Helper Functions: Create API helper functions within the `src/api` directory. These will assist in setting up test data for the testing state. There are other helper functions in the `src/utils` and `src/fixtures` directories.
3. Create a Test Specification File: In the `src/tests/AgencyForm` directory, create a file for your test. For example, if you are testing the login functionality, name it `Login.spec.ts`. For further reference: [Playwright Documentation](https://playwright.dev/docs/intro).

## Structure
- src/pages for page objects
- src/tests for Playwright specs
- src/api for helper APIs

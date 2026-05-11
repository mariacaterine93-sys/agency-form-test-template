/**
 * Environment configuration loaded from .env file
 * All URLs and credentials are managed here for centralized control
 */

export const environment = {
  // Base URLs from .env file
  DTP_ROOT_URL: process.env.DTP_ROOT_URL || 'https://forms.preprod.beta.my.qld.gov.au',
  TC_SERVICE_BASE_URL: process.env.TC_SERVICE_BASE_URL || 'https://txconfig.preprod.beta.my.qld.gov.au',
  GAPI_URL: process.env.E2E_DTP_GAPI_URL || 'https://www.preprod.graph.qld.gov.au/graphql',
  ATTACHMENT_S3_BUCKET_URL: process.env.ATTACHMENT_S3_BUCKET_URL || 'https://myqld-service-request-attachments-preprod-indigo.s3.ap-southeast-2.amazonaws.com/',

  // Form configuration
  FORM_NAME: process.env.E2E_DTP_FORM_NAME || 'CC Apply',
  
  // Application URLs
  COMPANION_CARD_APPLY_URL: `${process.env.DTP_ROOT_URL || 'https://forms.preprod.beta.my.qld.gov.au'}/companioncardapply`,
  COMPANION_CARD_AGENCY_FORM_URL: `${process.env.DTP_ROOT_URL || 'https://forms.preprod.beta.my.qld.gov.au'}/companioncardapply/agency-form`,

  // Test Runner configuration
  TEST_RUNNER_ENV: process.env.E2E_TEST_RUNNER_ENV || 'preprod',
  TEST_RUNNER_CLIENT_ID: process.env.E2E_TEST_RUNNER_CLIENT_ID || 'test-runner-ccms',
  TEST_RUNNER_CLIENT_SECRET: process.env.E2E_TEST_RUNNER_CLIENT_SECRET || '',
  TEST_USER_IDS: process.env.E2E_TEST_USER_IDS || '1',
  TEST_RUNNER_PASSWORD: process.env.E2E_TEST_RUNNER_PASSWORD || '',
  SUBSCRIBER_CLIENT_ID: process.env.E2E_SUBSCRIBER_CLIENT_ID || '',
  SUBSCRIBER_CLIENT_SECRET: process.env.E2E_SUBSCRIBER_CLIENT_SECRET || '',

  // Timeouts
  DEFAULT_WAIT_TIMEOUT: 30000,
  LONG_WAIT_TIMEOUT: 60000,
  NAVIGATION_TIMEOUT: 90000,

  // Test data
  TEST_USER_EMAIL: process.env.E2E_TEST_USER_EMAIL || 'IndustryRDTI27@test.gov.au',
};

export default environment;

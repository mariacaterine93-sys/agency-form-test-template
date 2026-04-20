export const config = {
  baseUrl: process.env.BASE_URL || 'https://forms.uat.beta.my.qld.gov.au/companioncardapply',
  username: process.env.TEST_USERNAME || '',
  password: process.env.TEST_PASSWORD || '',
  E2E_TEST_USER_EMAIL: process.env.E2E_TEST_USER_EMAIL || 'IndustryRDTI27@test.gov.au',
};

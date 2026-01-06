// src/config.js - COMPLETELY CLEAN CONFIG
const awsConfig = {
  Auth: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_CbpwHSrkT',
    userPoolWebClientId: '1aoubtc0kgdelh63dk17ha4pp8',
    authenticationFlowType: 'USER_PASSWORD_AUTH'
  }
};

// Explicitly remove ANY OAuth references
if (awsConfig.Auth.oauth) {
  delete awsConfig.Auth.oauth;
}

export default awsConfig;
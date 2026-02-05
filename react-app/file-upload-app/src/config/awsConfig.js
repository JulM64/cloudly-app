// src/config/awsConfig.js - AWS Cognito and S3 Configuration

export const awsConfig = {
  // Cognito Configuration
  cognito: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_b2tbKQ0Sj',
    userPoolWebClientId: '6ikisor60n1hogmk7a0h7dk7im',
    identityPoolId: process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID,
  },
  
  // S3 Configuration
  s3: {
    region: 'us-east-1',
    bucketPrefix: 'cloudly-dept',
  },

  // Cognito Groups (Roles)
  groups: {
    SUPER_ADMIN: 'Administrators',
    DEPARTMENT_ADMIN: 'DepartmentAdmins',
    USER: 'Users'
  }
};

// Department to S3 bucket mapping
export const getDepartmentBucket = (departmentName) => {
  const sanitizedName = departmentName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `${awsConfig.s3.bucketPrefix}-${sanitizedName}`;
};

// List of departments
export const DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Operations',
  'IT',
  'Legal'
];
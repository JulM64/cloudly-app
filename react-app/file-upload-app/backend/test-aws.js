// backend/test-aws.js
const AWS = require('aws-sdk');
require('dotenv').config();

console.log('🔍 AWS Configuration Test');
console.log('='.repeat(50));

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

console.log('📍 Region:', process.env.AWS_REGION);
console.log('🔑 Access Key:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...');
console.log('='.repeat(50));
console.log('');

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Test DynamoDB
console.log('🗄️  Testing DynamoDB...');
dynamoDB.scan({ TableName: 'cloudly-departments', Limit: 5 }, (err, data) => {
  if (err) {
    console.error('❌ DynamoDB Error:', err.code, '-', err.message);
  } else {
    console.log('✅ DynamoDB Connected!');
    console.log('   Tables: cloudly-departments');
    console.log('   Items found:', data.Items.length);
    if (data.Items.length > 0) {
      console.log('   Sample item:', data.Items[0].name);
    }
  }
  console.log('');
  
  // Test S3
  console.log('☁️  Testing S3...');
  s3.listBuckets((err, data) => {
    if (err) {
      console.error('❌ S3 Error:', err.code, '-', err.message);
    } else {
      console.log('✅ S3 Connected!');
      const cloudlyBuckets = data.Buckets.filter(b => b.Name.startsWith('cloudly-dept'));
      console.log('   Total buckets:', data.Buckets.length);
      console.log('   Cloudly buckets:', cloudlyBuckets.length);
      cloudlyBuckets.forEach(bucket => {
        console.log('   -', bucket.Name);
      });
    }
    console.log('');
    console.log('='.repeat(50));
    console.log('Test complete!');
  });
});
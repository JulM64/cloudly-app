// update-bucket-cors.js
// One-off maintenance script — run this locally whenever your frontend's URL changes
// (e.g. after deploying, or switching domains). It loops through every department
// in DynamoDB and updates that department's S3 bucket to trust the new origin.
//
// Usage:
//   1. Make sure your backend's .env is in the same folder (or export the same
//      AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY vars in your shell).
//   2. node update-bucket-cors.js https://gentle-caramel-73a129.netlify.app
//
// You can pass multiple allowed origins separated by commas if you need both your
// live site and localhost to keep working during local development, e.g.:
//   node update-bucket-cors.js https://gentle-caramel-73a129.netlify.app,http://localhost:3000

require('dotenv').config();
const AWS = require('aws-sdk');

const newOrigins = process.argv[2];
if (!newOrigins) {
  console.error('❌ Usage: node update-bucket-cors.js https://your-frontend-url.netlify.app[,http://localhost:3000]');
  process.exit(1);
}
const allowedOrigins = newOrigins.split(',').map((o) => o.trim()).filter(Boolean);

AWS.config.update({ region: process.env.AWS_REGION });
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

async function main() {
  console.log('🔍 Scanning cloudly-departments table...');
  const result = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
  const departments = result.Items || [];

  if (departments.length === 0) {
    console.log('No departments found — nothing to update.');
    return;
  }

  console.log(`Found ${departments.length} department(s). Allowed origins will be set to:`, allowedOrigins);
  console.log('');

  let updated = 0, skipped = 0, failed = 0;

  for (const dept of departments) {
    const bucket = dept.s3Bucket;
    const label = dept.name || dept.id || '(unnamed)';

    if (!bucket) {
      console.log(`⚠️  Skipping "${label}" — no s3Bucket field found on this record.`);
      skipped++;
      continue;
    }

    try {
      // 1. Update CORS to trust the new frontend origin(s)
      await s3.putBucketCors({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [{
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: allowedOrigins,
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000,
          }],
        },
      }).promise();

      // 2. Safety net — make sure public access is blocked (harmless if already set)
      await s3.putPublicAccessBlock({
        Bucket: bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
      }).promise();

      // 3. Safety net — make sure default encryption is on (harmless if already set)
      await s3.putBucketEncryption({
        Bucket: bucket,
        ServerSideEncryptionConfiguration: {
          Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }],
        },
      }).promise();

      console.log(`✅ Updated "${label}" → bucket: ${bucket}`);
      updated++;
    } catch (err) {
      console.error(`❌ Failed to update "${label}" (bucket: ${bucket}): ${err.message}`);
      failed++;
    }
  }

  console.log('');
  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
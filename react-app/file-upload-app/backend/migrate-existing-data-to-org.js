// migrate-existing-data-to-org.js
// One-time script — run this ONCE to turn your current, existing company's data
// into "org #1" of your new multi-tenant setup. Safe to re-run if it fails partway:
// anything already tagged with an orgId is skipped, not overwritten.
//
// Usage:
//   node migrate-existing-data-to-org.js "Your Company Name" owner@email.com

require('dotenv').config();
const AWS = require('aws-sdk');

const [, , ORG_NAME, OWNER_EMAIL] = process.argv;
if (!ORG_NAME || !OWNER_EMAIL) {
  console.error('❌ Usage: node migrate-existing-data-to-org.js "Your Company Name" owner@email.com');
  process.exit(1);
}

AWS.config.update({ region: process.env.AWS_REGION });
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

const TABLES_TO_MIGRATE = [
  'cloudly-files',
  'cloudly-departments',
  'cloudly-activities',
  'cloudly-role-requests',
  'cloudly-user-profiles',
  'cloudly-file-delete-requests',
];

async function scanAll(tableName) {
  let items = [];
  let ExclusiveStartKey;
  do {
    const res = await dynamoDB.scan({ TableName: tableName, ExclusiveStartKey }).promise();
    items = items.concat(res.Items || []);
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function migrateTable(tableName, orgId) {
  const items = await scanAll(tableName);
  let updated = 0, skipped = 0, failed = 0;

  for (const item of items) {
    if (item.orgId) { skipped++; continue; } // already tagged — don't touch it
    try {
      // Put with the same key attributes already on the item just updates it in
      // place, so this works regardless of each table's exact key schema.
      await dynamoDB.put({ TableName: tableName, Item: { ...item, orgId } }).promise();
      updated++;
    } catch (err) {
      console.error(`  ❌ Failed to tag an item in ${tableName}: ${err.message}`);
      failed++;
    }
  }
  console.log(`  ${tableName}: ${updated} updated, ${skipped} already tagged, ${failed} failed (${items.length} total)`);
}

async function migrateUsers(orgId) {
  let users = [];
  let PaginationToken;
  do {
    const res = await cognito.listUsers({ UserPoolId: process.env.COGNITO_USER_POOL_ID, PaginationToken }).promise();
    users = users.concat(res.Users || []);
    PaginationToken = res.PaginationToken;
  } while (PaginationToken);

  let updated = 0, skipped = 0, failed = 0;
  for (const user of users) {
    const existingOrgId = (user.Attributes || []).find((a) => a.Name === 'custom:orgId')?.Value;
    if (existingOrgId) { skipped++; continue; }
    try {
      await cognito.adminUpdateUserAttributes({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: user.Username,
        UserAttributes: [{ Name: 'custom:orgId', Value: orgId }],
      }).promise();
      updated++;
    } catch (err) {
      console.error(`  ❌ Failed to tag user ${user.Username}: ${err.message}`);
      failed++;
    }
  }
  console.log(`  Cognito users: ${updated} updated, ${skipped} already tagged, ${failed} failed (${users.length} total)`);
}

async function main() {
  console.log(`🏢 Creating organization record for "${ORG_NAME}"...`);
  const orgId = `org_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await dynamoDB.put({
    TableName: 'cloudly-organizations',
    Item: {
      orgId,
      name: ORG_NAME.trim(),
      ownerEmail: OWNER_EMAIL.trim().toLowerCase(),
      plan: 'free',
      createdAt: new Date().toISOString(),
    },
  }).promise();
  console.log(`✅ Organization created: orgId = ${orgId}\n`);

  console.log('👥 Tagging existing Cognito users...');
  await migrateUsers(orgId);
  console.log('');

  console.log('🗄️  Tagging existing DynamoDB records...');
  for (const table of TABLES_TO_MIGRATE) {
    await migrateTable(table, orgId);
  }

  console.log('\n✅ Migration complete!');
  console.log(`📌 Save this orgId somewhere safe, just in case: ${orgId}`);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
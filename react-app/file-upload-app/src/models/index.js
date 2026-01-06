// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { User, Company, File } = initSchema(schema);

export {
  User,
  Company,
  File
};
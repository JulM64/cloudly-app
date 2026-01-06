/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateUser = /* GraphQL */ `
  subscription OnCreateUser(
    $filter: ModelSubscriptionUserFilterInput
    $id: String
  ) {
    onCreateUser(filter: $filter, id: $id) {
      id
      email
      username
      companyId
      role
      status
      storageUsed
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateUser = /* GraphQL */ `
  subscription OnUpdateUser(
    $filter: ModelSubscriptionUserFilterInput
    $id: String
  ) {
    onUpdateUser(filter: $filter, id: $id) {
      id
      email
      username
      companyId
      role
      status
      storageUsed
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteUser = /* GraphQL */ `
  subscription OnDeleteUser(
    $filter: ModelSubscriptionUserFilterInput
    $id: String
  ) {
    onDeleteUser(filter: $filter, id: $id) {
      id
      email
      username
      companyId
      role
      status
      storageUsed
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateCompany = /* GraphQL */ `
  subscription OnCreateCompany(
    $filter: ModelSubscriptionCompanyFilterInput
    $owner: String
  ) {
    onCreateCompany(filter: $filter, owner: $owner) {
      id
      name
      slug
      plan
      storageLimit
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onUpdateCompany = /* GraphQL */ `
  subscription OnUpdateCompany(
    $filter: ModelSubscriptionCompanyFilterInput
    $owner: String
  ) {
    onUpdateCompany(filter: $filter, owner: $owner) {
      id
      name
      slug
      plan
      storageLimit
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onDeleteCompany = /* GraphQL */ `
  subscription OnDeleteCompany(
    $filter: ModelSubscriptionCompanyFilterInput
    $owner: String
  ) {
    onDeleteCompany(filter: $filter, owner: $owner) {
      id
      name
      slug
      plan
      storageLimit
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onCreateFile = /* GraphQL */ `
  subscription OnCreateFile(
    $filter: ModelSubscriptionFileFilterInput
    $owner: String
  ) {
    onCreateFile(filter: $filter, owner: $owner) {
      id
      name
      key
      size
      type
      uploadedBy
      companyId
      isPublic
      downloadCount
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onUpdateFile = /* GraphQL */ `
  subscription OnUpdateFile(
    $filter: ModelSubscriptionFileFilterInput
    $owner: String
  ) {
    onUpdateFile(filter: $filter, owner: $owner) {
      id
      name
      key
      size
      type
      uploadedBy
      companyId
      isPublic
      downloadCount
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onDeleteFile = /* GraphQL */ `
  subscription OnDeleteFile(
    $filter: ModelSubscriptionFileFilterInput
    $owner: String
  ) {
    onDeleteFile(filter: $filter, owner: $owner) {
      id
      name
      key
      size
      type
      uploadedBy
      companyId
      isPublic
      downloadCount
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;

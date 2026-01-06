import { ModelInit, MutableModel, __modelMeta__, ManagedIdentifier } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled } from "@aws-amplify/datastore";





type EagerUser = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<User, 'id'>;
  };
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly companyId: string;
  readonly role: string;
  readonly status: string;
  readonly storageUsed?: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

type LazyUser = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<User, 'id'>;
  };
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly companyId: string;
  readonly role: string;
  readonly status: string;
  readonly storageUsed?: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export declare type User = LazyLoading extends LazyLoadingDisabled ? EagerUser : LazyUser

export declare const User: (new (init: ModelInit<User>) => User) & {
  copyOf(source: User, mutator: (draft: MutableModel<User>) => MutableModel<User> | void): User;
}

type EagerCompany = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Company, 'id'>;
  };
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly plan: string;
  readonly storageLimit: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

type LazyCompany = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Company, 'id'>;
  };
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly plan: string;
  readonly storageLimit: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export declare type Company = LazyLoading extends LazyLoadingDisabled ? EagerCompany : LazyCompany

export declare const Company: (new (init: ModelInit<Company>) => Company) & {
  copyOf(source: Company, mutator: (draft: MutableModel<Company>) => MutableModel<Company> | void): Company;
}

type EagerFile = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<File, 'id'>;
  };
  readonly id: string;
  readonly name: string;
  readonly key: string;
  readonly size: number;
  readonly type: string;
  readonly uploadedBy: string;
  readonly companyId: string;
  readonly isPublic?: boolean | null;
  readonly downloadCount?: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

type LazyFile = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<File, 'id'>;
  };
  readonly id: string;
  readonly name: string;
  readonly key: string;
  readonly size: number;
  readonly type: string;
  readonly uploadedBy: string;
  readonly companyId: string;
  readonly isPublic?: boolean | null;
  readonly downloadCount?: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export declare type File = LazyLoading extends LazyLoadingDisabled ? EagerFile : LazyFile

export declare const File: (new (init: ModelInit<File>) => File) & {
  copyOf(source: File, mutator: (draft: MutableModel<File>) => MutableModel<File> | void): File;
}
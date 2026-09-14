/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { AuthUser } from '@movea/api-contract';
import { Schema } from 'effect';

export type { AuthUser };

export const SignUpDataSchema = Schema.Struct({
  email: Schema.String,
  password: Schema.String,
  firstName: Schema.String,
  lastName: Schema.String,
});

export const SignInDataSchema = Schema.Struct({
  email: Schema.String,
  password: Schema.String,
});

/**
 * A live session: the authenticated user plus the access token that proves it.
 * The refresh token is not carried here — it lives only in secure storage.
 */
export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

export const UserProfileSchema = Schema.Struct({
  id: Schema.String,
  fullName: Schema.optional(Schema.String),
  firstName: Schema.optional(Schema.String),
  lastName: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
  phoneNumber: Schema.optional(Schema.String),
  address: Schema.optional(Schema.String),
  avatarUrl: Schema.optional(Schema.String),
  createdAt: Schema.optional(Schema.String),
  updatedAt: Schema.optional(Schema.String),
});

export const UpdateProfileDataSchema = Schema.Struct({
  firstName: Schema.optional(Schema.String),
  lastName: Schema.optional(Schema.String),
  phoneNumber: Schema.optional(Schema.String),
  address: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
  avatarUrl: Schema.optional(Schema.String),
});

export const ChangePasswordDataSchema = Schema.Struct({
  currentPassword: Schema.String,
  newPassword: Schema.String,
});

export interface SignUpData extends Schema.Schema.Type<
  typeof SignUpDataSchema
> {}
export interface SignInData extends Schema.Schema.Type<
  typeof SignInDataSchema
> {}
export interface UserProfile extends Schema.Schema.Type<
  typeof UserProfileSchema
> {}
export interface UpdateProfileData extends Schema.Schema.Type<
  typeof UpdateProfileDataSchema
> {}
export interface ChangePasswordData extends Schema.Schema.Type<
  typeof ChangePasswordDataSchema
> {}

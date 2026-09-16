import { Schema } from 'effect';

// Constants
import { ERROR_MESSAGES } from './messages';
import {
  LOWERCASE_REGEX,
  SPECIAL_CHAR_REGEX,
  UPPERCASE_REGEX,
  EMAIL_REGEX,
  PHONE_NUMBER_REGEX,
} from './regex';

// Email Brand
export const EmailBrand = Schema.String.pipe(
  Schema.nonEmptyString({ message: () => ERROR_MESSAGES.EMAIL_REQUIRED }),
  Schema.filter(s => EMAIL_REGEX.test(s), {
    message: () => ERROR_MESSAGES.EMAIL_INVALID,
  }),
  Schema.brand('Email'),
).annotations({
  identifier: 'email',
  title: 'Email',
  description: 'Email of the user',
  type: 'string',
  required: true,
  example: ['john.doe@example.com', 'kimi.johnson@example.com'],
});
export type EmailType = Schema.Schema.Type<typeof EmailBrand>;

// Password Brand
export const PasswordBrand = Schema.String.pipe(
  Schema.nonEmptyString({ message: () => ERROR_MESSAGES.PASSWORD_REQUIRED }),
  Schema.minLength(8, {
    message: () => ERROR_MESSAGES.PASSWORD_MIN_LENGTH(8),
  }),
  Schema.filter(s => UPPERCASE_REGEX.test(s), {
    message: () => ERROR_MESSAGES.PASSWORD_UPPERCASE,
  }),
  Schema.filter(s => LOWERCASE_REGEX.test(s), {
    message: () => ERROR_MESSAGES.PASSWORD_LOWERCASE,
  }),
  Schema.filter(s => SPECIAL_CHAR_REGEX.test(s), {
    message: () => ERROR_MESSAGES.PASSWORD_SPECIAL_CHAR,
  }),
  Schema.brand('Password'),
).annotations({
  identifier: 'password',
  title: 'Password',
  description:
    'Password of the user needs to be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one special character',
  type: 'string',
  required: true,
  example: ['!Password123', 'StrongPassword123!'],
});
export type PasswordType = Schema.Schema.Type<typeof PasswordBrand>;

// Full Name Brand
export const FullNameBrand = Schema.String.pipe(
  Schema.nonEmptyString({ message: () => ERROR_MESSAGES.FULL_NAME_REQUIRED }),
  Schema.minLength(2, {
    message: () => ERROR_MESSAGES.FULL_NAME_MIN_LENGTH(2),
  }),
  Schema.maxLength(50, {
    message: () => ERROR_MESSAGES.FULL_NAME_MAX_LENGTH(50),
  }),
  Schema.brand('FullName'),
).annotations({
  identifier: 'fullName',
  title: 'Full Name',
  description: 'Full name of the user',
  type: 'string',
  required: true,
  example: ['John Doe', 'Kimi Johnson'],
});
export type FullNameType = Schema.Schema.Type<typeof FullNameBrand>;

// First Name Brand
export const FirstNameBrand = Schema.String.pipe(
  Schema.nonEmptyString({ message: () => ERROR_MESSAGES.FIRST_NAME_REQUIRED }),
  Schema.minLength(2, { message: () => ERROR_MESSAGES.NAME_MIN_LENGTH(2) }),
  Schema.maxLength(50, { message: () => ERROR_MESSAGES.NAME_MAX_LENGTH(50) }),
  Schema.brand('FirstName'),
).annotations({
  identifier: 'firstName',
  title: 'First Name',
  description: 'First name of the user',
  type: 'string',
  required: true,
  example: ['John', 'Kimi'],
});
export type FirstNameType = Schema.Schema.Type<typeof FirstNameBrand>;

// Last Name Brand
export const LastNameBrand = Schema.String.pipe(
  Schema.nonEmptyString({ message: () => ERROR_MESSAGES.LAST_NAME_REQUIRED }),
  Schema.minLength(2, { message: () => ERROR_MESSAGES.NAME_MIN_LENGTH(2) }),
  Schema.maxLength(50, { message: () => ERROR_MESSAGES.NAME_MAX_LENGTH(50) }),
  Schema.brand('LastName'),
).annotations({
  identifier: 'lastName',
  title: 'Last Name',
  description: 'Last name of the user',
  type: 'string',
  required: true,
  example: ['Doe', 'Johnson'],
});
export type LastNameType = Schema.Schema.Type<typeof LastNameBrand>;

// Phone Number Brand
export const PhoneNumberBrand = Schema.NullOr(Schema.String)
  .pipe(
    Schema.transform(Schema.String, {
      decode: val => val ?? '',
      encode: val => val,
    }),
    Schema.filter(s => s === '' || PHONE_NUMBER_REGEX.test(s), {
      message: () => ERROR_MESSAGES.INVALID_PHONE_NUMBER,
    }),
    Schema.brand('PhoneNumber'),
  )
  .annotations({
    identifier: 'phoneNumber',
    title: 'Phone Number',
    description:
      'Optional phone number: local (starts with 0, 9–11 digits) or international (optional +, 9–15 digits)',
    type: 'string',
    required: false,
    example: '099898379',
  });
export type PhoneNumberType = Schema.Schema.Type<typeof PhoneNumberBrand>;

// Address Brand
export const AddressBrand = Schema.NullOr(Schema.String)
  .pipe(
    Schema.transform(Schema.String, {
      decode: val => (val ?? '').trim(),
      encode: val => val,
    }),
    Schema.brand('Address'),
  )
  .annotations({
    identifier: 'address',
    title: 'Address',
    description: 'Address of the user',
    type: 'string',
    required: false,
    example: '123 Main St, Anytown, USA',
  });
export type AddressType = Schema.Schema.Type<typeof AddressBrand>;

// Sign In Schema
export const signInSchema = Schema.Struct({
  email: EmailBrand,
  password: PasswordBrand,
});
export type SignInFormData = Schema.Schema.Type<typeof signInSchema>;

// Sign Up Schema with password confirmation
export const signUpSchema = Schema.Struct({
  firstName: FirstNameBrand,
  lastName: LastNameBrand,
  email: EmailBrand,
  password: PasswordBrand,
  confirmPassword: Schema.String.pipe(
    Schema.minLength(1, {
      message: () => ERROR_MESSAGES.CONFIRM_PASSWORD_REQUIRED,
    }),
  ),
}).pipe(
  Schema.filter(data =>
    data.password === data.confirmPassword
      ? undefined
      : [
          {
            path: ['confirmPassword'],
            message: ERROR_MESSAGES.PASSWORD_NOT_MATCH,
          },
        ],
  ),
);
export type SignUpFormData = Schema.Schema.Type<typeof signUpSchema>;

// Edit Profile Schema
export const editProfileSchema = Schema.Struct({
  firstName: FirstNameBrand,
  lastName: LastNameBrand,
  email: EmailBrand,
  address: AddressBrand,
  phoneNumber: PhoneNumberBrand,
  avatarUrl: Schema.NullOr(Schema.String),
});
export type EditProfileFormData = Schema.Schema.Type<typeof editProfileSchema>;

// Change Password Schema
export const changePasswordSchema = Schema.Struct({
  currentPassword: PasswordBrand,
  newPassword: PasswordBrand,
  confirmPassword: PasswordBrand,
}).pipe(
  Schema.filter(data =>
    data.newPassword === data.confirmPassword
      ? undefined
      : [
          {
            path: ['confirmPassword'],
            message: ERROR_MESSAGES.PASSWORD_NOT_MATCH,
          },
        ],
  ),
);
export type ChangePasswordFormData = Schema.Schema.Type<
  typeof changePasswordSchema
>;

// Reset Password Schema
export const resetPasswordSchema = Schema.Struct({
  newPassword: PasswordBrand,
  confirmPassword: PasswordBrand,
}).pipe(
  Schema.filter(data =>
    data.newPassword === data.confirmPassword
      ? undefined
      : [
          {
            path: ['confirmPassword'],
            message: ERROR_MESSAGES.PASSWORD_NOT_MATCH,
          },
        ],
  ),
);
export type ResetPasswordFormData = Schema.Schema.Type<
  typeof resetPasswordSchema
>;

// Forgot Password Schema
export const forgotPasswordSchema = Schema.Struct({
  email: EmailBrand,
});
export type ForgotPasswordFormData = Schema.Schema.Type<
  typeof forgotPasswordSchema
>;

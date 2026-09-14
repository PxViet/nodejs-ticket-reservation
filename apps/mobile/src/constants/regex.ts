export const UPPERCASE_REGEX = /[A-Z]/;
export const LOWERCASE_REGEX = /[a-z]/;
export const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>\[\]\\\/_+\-=~`]/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Local (0 + 8–10 digits) or international (optional +, 9–15 digits)
export const PHONE_NUMBER_REGEX = /^(0\d{8,10}|\+?[1-9]\d{8,14})$/;

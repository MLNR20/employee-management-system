import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";

// The name format (letters only, at least 2 characters) is checked at the HTTP edge by the
// validator chains in presentation/http/validation/personName.js. These rules cover the rest.
const REQUIRED = ["firstName", "lastName", "relationship", "phoneNumber"];
const WRITABLE = [...REQUIRED, "email", "address", "isActive"]; // employeeId is fixed once a contact exists

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARACTERS = /^\+?[\d\s().-]+$/;
const PHONE_DIGITS = { min: 7, max: 15 }; // E.164 allows at most 15 digits

export const TEXT_MAX = { relationship: 50, address: 200 };

/** Throws ValidationError unless the required fields are present and the optional ones well formed. */
export function assertValidEmergencyContact(input) {
  if (REQUIRED.some((field) => isMissing(input[field]))) {
    throw new ValidationError("Send all required fields: first name, last name, relationship, phone number");
  }

  const text = (field) => (isMissing(input[field]) ? "" : String(input[field]).trim());

  if (text("relationship").length > TEXT_MAX.relationship) {
    throw new ValidationError(`Relationship must be at most ${TEXT_MAX.relationship} characters`);
  }
  if (text("address").length > TEXT_MAX.address) {
    throw new ValidationError(`Address must be at most ${TEXT_MAX.address} characters`);
  }
  if (text("email") && !EMAIL.test(text("email"))) {
    throw new ValidationError("Enter a valid email address");
  }

  const phone = text("phoneNumber");
  const digits = phone.replace(/\D/g, "").length;
  if (!PHONE_CHARACTERS.test(phone) || digits < PHONE_DIGITS.min || digits > PHONE_DIGITS.max) {
    throw new ValidationError(`Phone number must have ${PHONE_DIGITS.min} to ${PHONE_DIGITS.max} digits`);
  }
}

/** The employee a new contact belongs to must be named. */
export function assertValidEmergencyContactEmployee(input) {
  if (isMissing(input.employeeId) || typeof input.employeeId !== "string") {
    throw new ValidationError("Send the employee this contact belongs to: employeeId");
  }
}

/** Whitelists the writable fields, trims text and stores the email in lower case. */
export const pickEmergencyContactFields = (input) => {
  const picked = pickFields(input, WRITABLE);
  for (const [field, value] of Object.entries(picked)) {
    if (typeof value === "string") picked[field] = value.trim();
  }
  if (typeof picked.email === "string") picked.email = picked.email.toLowerCase();
  return picked;
};

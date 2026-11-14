import { validatePersonName } from "../../validation/personName";
import { validatePhone } from "../../validation/phone";

// Rules for the emergency contact filled in on the Add Employee form. They mirror the server's
// (server/src/domain/employee/emergencyContactRules.js) so mistakes show before the request.

export const CONTACT_FIELDS = ["firstName", "lastName", "relationship", "phoneNumber", "email", "address"];
export const CONTACT_TEXT_MAX = { relationship: 50, address: 200 };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True once the person has typed anything into the contact section. */
export const hasContactInput = (values = {}) => CONTACT_FIELDS.some((field) => String(values[field] ?? "").trim());

/**
 * Errors by field name. The contact is optional: an untouched section is valid, but once any
 * field is filled, name, relationship and phone are required.
 */
export const validateContact = (values = {}) => {
  if (!hasContactInput(values)) return {};

  const text = (field) => String(values[field] ?? "").trim();
  const errors = {};

  const firstName = validatePersonName("First name", values.firstName);
  if (firstName) errors.firstName = firstName;

  const lastName = validatePersonName("Last name", values.lastName);
  if (lastName) errors.lastName = lastName;

  if (!text("relationship")) errors.relationship = "Relationship is required.";
  else if (text("relationship").length > CONTACT_TEXT_MAX.relationship) {
    errors.relationship = `Relationship must be at most ${CONTACT_TEXT_MAX.relationship} characters.`;
  }

  if (!text("phoneNumber")) errors.phoneNumber = "Phone number is required.";
  else {
    const phone = validatePhone(values.phoneNumber);
    if (phone) errors.phoneNumber = phone;
  }

  if (text("email") && !EMAIL.test(text("email"))) errors.email = "Enter a valid email address.";

  if (text("address").length > CONTACT_TEXT_MAX.address) {
    errors.address = `Address must be at most ${CONTACT_TEXT_MAX.address} characters.`;
  }

  return errors;
};

/** The request body for an emergency contact of the given employee. */
export const toContactPayload = (employeeId, values) => ({
  employeeId,
  ...Object.fromEntries(CONTACT_FIELDS.map((field) => [field, String(values[field] ?? "").trim()])),
});

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

// --- The list of contacts on the Add / Edit Employee form --------------------------------------------
// An employee can have several contacts. The form keeps them as rows: `key` identifies a row while
// it is on screen, and `id` is set once the contact exists on the server.

let rowCounter = 0;

/** A blank row for a new contact. */
export const newContactRow = () => ({ key: `new-${++rowCounter}` });

/** A form row for a contact that is already saved. */
export const contactRowFromEntity = (contact) => ({
  key: contact.id,
  id: contact.id,
  ...Object.fromEntries(CONTACT_FIELDS.map((field) => [field, contact[field] ?? ""])),
});

/**
 * Errors for every row, as { [row.key]: { [field]: message } } (rows without errors are left out).
 * A blank new row is ignored, but a saved contact cannot be blanked out: it must be filled in or removed.
 */
export const validateContactRows = (rows = []) => {
  const errors = {};
  rows.forEach((row) => {
    const rowErrors = validateContact(row);
    if (row.id && !hasContactInput(row)) rowErrors.firstName = "Fill in this contact or remove it.";
    if (Object.keys(rowErrors).length > 0) errors[row.key] = rowErrors;
  });
  return errors;
};

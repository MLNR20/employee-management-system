export const PHONE_DIGITS = { min: 7, max: 15 }; // E.164 allows at most 15 digits

/** The problem with a phone number, or undefined when it is fine. The server applies the same rule. */
export const validatePhone = (value) => {
  const text = String(value ?? "").trim();
  const digits = text.replace(/\D/g, "").length;
  if (!/^\+?[\d\s().-]+$/.test(text) || digits < PHONE_DIGITS.min || digits > PHONE_DIGITS.max) {
    return `Phone number must have ${PHONE_DIGITS.min} to ${PHONE_DIGITS.max} digits.`;
  }
  return undefined;
};

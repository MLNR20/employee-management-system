import { Entity } from "../Entity.js";

/**
 * One line of the onboarding document checklist: something every new hire has to hand in.
 * The checklist for an employee is the set of active requirements, matched against what they have submitted.
 */
export class DocumentRequirement extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.name e.g. "NBI clearance"
   * @param {string} [props.description] what to bring, in plain words
   * @param {boolean} [props.isRequired] false for nice-to-have documents that do not block the checklist
   * @param {boolean} [props.hasExpiry] true when the document goes out of date and its expiry must be recorded
   */
  constructor({ name, description = "", isRequired = true, hasExpiry = false, ...base } = {}) {
    super(base);
    this.name = name;
    this.description = description;
    this.isRequired = isRequired;
    this.hasExpiry = hasExpiry;
  }
}

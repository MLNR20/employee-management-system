import { Entity } from "../Entity.js";

/** Which checklist a requirement belongs to: joining the company or leaving it. */
export const DocumentStage = Object.freeze({
  ONBOARDING: "onboarding",
  OFFBOARDING: "offboarding",
});

/**
 * One line of a document checklist: something every new hire has to hand in (onboarding), or something
 * to be collected or issued when an employee leaves (offboarding). The checklist for an employee is the
 * set of active requirements of one stage, matched against what has been recorded for them.
 */
export class DocumentRequirement extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.name e.g. "NBI clearance"
   * @param {string} [props.description] what to bring, in plain words
   * @param {boolean} [props.isRequired] false for nice-to-have documents that do not block the checklist
   * @param {boolean} [props.hasExpiry] true when the document goes out of date and its expiry must be recorded
   * @param {string} [props.stage] a DocumentStage
   */
  constructor({
    name,
    description = "",
    isRequired = true,
    hasExpiry = false,
    stage = DocumentStage.ONBOARDING, // requirements saved before stages existed are onboarding ones
    ...base
  } = {}) {
    super(base);
    this.name = name;
    this.description = description;
    this.isRequired = isRequired;
    this.hasExpiry = hasExpiry;
    this.stage = stage;
  }
}

// The standard onboarding and offboarding checklists. Each is created on start-up when no requirement
// of its stage exists yet. HR can rename, add, deactivate or delete lines afterwards (the government
// forms and numbers are Philippine).

const ONBOARDING = [
  { name: "Signed employment contract", description: "Contract signed by both the employee and the company." },
  { name: "Valid government-issued ID", description: "Photocopy of one valid ID with photo and signature.", hasExpiry: true },
  { name: "NBI clearance", description: "Original, issued within the last 6 months.", hasExpiry: true },
  { name: "PSA birth certificate", description: "Certified copy issued by the PSA." },
  { name: "TIN (BIR Form 1902 or ID)", description: "Proof of the employee's Tax Identification Number." },
  { name: "SSS number proof", description: "SSS E-1 form, ID or e-registration screenshot." },
  { name: "PhilHealth number proof", description: "PhilHealth Member Data Record (MDR) or ID." },
  { name: "Pag-IBIG number proof", description: "Pag-IBIG MID or loyalty card." },
  { name: "Pre-employment medical exam", description: "Result from an accredited clinic.", hasExpiry: true },
  { name: "2x2 ID photos", description: "Two recent photos with white background." },
  { name: "Diploma or Transcript of Records", description: "Photocopy of the highest educational attainment." },
  {
    name: "Certificate of Employment (previous employer)",
    description: "Only if the employee has worked before.",
    isRequired: false,
  },
];

const OFFBOARDING = [
  { name: "Resignation letter or notice of termination", description: "The signed letter or notice, showing the last working day." },
  { name: "Exit clearance form", description: "Signed by every department that has to release the employee." },
  { name: "Company property return acknowledgment", description: "Laptop, ID, access cards, keys and other issued items." },
  { name: "Work turnover report", description: "Pending work, files and account hand-over, accepted by the manager." },
  { name: "Exit interview form", description: "Feedback collected before the employee leaves.", isRequired: false },
  { name: "Final pay computation", description: "Last salary, pro-rated 13th month pay, leave conversion and deductions." },
  { name: "Signed release, waiver and quitclaim", description: "Signed when the final pay is released." },
  { name: "BIR Form 2316", description: "Certificate of compensation paid and tax withheld, given to the employee." },
  { name: "Certificate of Employment", description: "Issued to the departing employee." },
];

export const DEFAULT_REQUIREMENTS = [
  ...ONBOARDING.map((requirement) => ({ ...requirement, stage: "onboarding" })),
  ...OFFBOARDING.map((requirement) => ({ ...requirement, stage: "offboarding" })),
];

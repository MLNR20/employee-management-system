// The standard onboarding checklist, created on first run when no requirements exist yet.
// HR can rename, add, deactivate or delete lines afterwards (the government numbers are Philippine).

export const DEFAULT_REQUIREMENTS = [
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

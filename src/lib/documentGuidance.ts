// Shared photo/upload guidance for identity documents (HR_V1).
// TEAM HUB COPY - keep in sync with the Hive original at
// hive-vault-guard/src/lib/hr/documentGuidance.ts. Do not edit the wording
// here without changing it there too.

export const IDENTITY_DOC_KEYS = ["photo_id", "proof_of_address", "right_to_work"] as const;

export const DOC_GUIDANCE: Record<string, { title: string; examples: string[] }> = {
  photo_id: {
    title: "Photo ID",
    examples: [
      "Current passport (photo page), or",
      "UK photocard driving licence (front)",
    ],
  },
  proof_of_address: {
    title: "Proof of address",
    examples: [
      "Utility bill, bank statement, or council tax letter",
      "Dated within the last 3 months",
      "Must show your full name and current home address",
      "Mobile phone bills are not accepted",
    ],
  },
  right_to_work: {
    title: "Right to work",
    examples: [
      "British or Irish passport photo page, or",
      "Home Office share code result (the gov.uk 'view proof' page is fine), or",
      "Visa or biometric residence permit, front and back",
    ],
  },
};

export const PHOTO_RULES_OK = [
  "Photograph the original document, straight on, with all four corners in the frame",
  "Sharp focus - every line of text must be readable",
  "Good even light, no glare or shadow across the details",
  "In-date documents only - expired ID cannot be accepted",
  "JPG, PNG, HEIC, or PDF, up to 15MB",
];

export const PHOTO_RULES_BAD = [
  "Corners or edges cut off",
  "Blurred, dark, or heavily angled shots",
  "Fingers or objects covering any detail",
  "Photos of photocopies, or screenshots of a photo",
  "Expired documents",
];

export const MAX_DOC_BYTES = 15 * 1024 * 1024;

export const ACCEPTED_MIME = "image/jpeg,image/png,image/heic,image/heif,application/pdf";

export function validateDocFile(file: File): string | null {
  if (file.size > MAX_DOC_BYTES) {
    return "That file is over 15MB. Take the photo again at normal quality, or export a smaller PDF.";
  }
  const okTypes = ["image/jpeg", "image/png", "image/heic", "image/heif", "application/pdf"];
  // Some Androids report an empty type for HEIC — fall back to the extension.
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const okExts = ["jpg", "jpeg", "png", "heic", "heif", "pdf"];
  if (!okTypes.includes(file.type) && !okExts.includes(ext)) {
    return "Please upload a photo (JPG, PNG, HEIC) or a PDF.";
  }
  return null;
}

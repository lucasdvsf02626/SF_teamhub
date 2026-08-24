// Standardized Job Titles matching The Hive (expanded for bulk imports)
export const JOB_TITLES = [
  "CEO",
  "Director",
  "General Manager",
  "Operations Manager",
  "Account Manager",
  "Sales Development Representative",
  "Business Development Representative",
  "Business Development Manager",
  "Sales Executive",
  "Production Manager",
  "Production Operations Manager",
  "Supply Chain Manager",
  "Quality Assurance Manager",
  "Quality Assurance Officer",
  "Senior Quality Assurance Officer",
  "Quality Control Assistant",
  "Quality Technician",
  "Lab Technician",
  "Formulation Scientist",
  "Formulation Support Co-ordinator",
  "Marketing Manager",
  "PR Manager",
  "Customer Service Representative",
  "Concierge",
  "Concierge & Account Manager",
  "Tech Support",
  "Finance Manager",
  "Financial Controller",
  "Team Leader",
  "Shift Leader",
  "Manufacturing Manager",
  "Senior QC Officer",
  "Production Operative",
  "Commercial Sales Manager",
  "Buyer",
  "Junior Buyer",
  "Senior Buyer",
  "Head of Supply Chain",
  "Head of ICT",
  "Head of Operations",
  "Head of Technical, Quality & Regulatory",
  "Chief Commercial Officer",
  "Group CRO",
  "Maintenance Engineer",
  "Engineer",
  "Cleaner",
  "Warehouse Operative",
  "Warehouse Manager",
  "Logistics",
  "Technical",
  "Technical Specialist",
  "Graphic Designer",
] as const;

// Standardized Departments matching The Hive (12 total)
export const DEPARTMENTS = [
  "Operations",
  "Lab & Formulation",
  "Technical, Quality & Regulatory",
  "Supply Chain",
  "Sales & Business Development, Concierge",
  "Marketing & PR",
  "Finance",
  "IT & Tech Support",
  "Manufacturing",
  "Warehouse",
  "Production",
  "Logistics",
] as const;

// Permission Levels (1-5)
export const PERMISSION_LEVELS = [
  { value: 1, label: "Inactive", color: "bg-muted text-muted-foreground" },
  { value: 2, label: "Employee", color: "bg-status-on-site/10 text-status-on-site" },
  { value: 3, label: "Manager", color: "bg-status-remote/10 text-status-remote" },
  { value: 4, label: "Admin", color: "bg-primary/10 text-primary" },
  { value: 5, label: "Architect", color: "bg-purple-500/10 text-purple-500" },
] as const;

// Only this email can be assigned Level 5 Architect
export const ARCHITECT_EMAIL = "lee@forzaindustries.com";

// Type exports
export type JobTitle = typeof JOB_TITLES[number];
export type Department = typeof DEPARTMENTS[number];
export type PermissionLevel = typeof PERMISSION_LEVELS[number];

// Job title mapping for bulk imports (maps common variations to standard titles)
export const JOB_TITLE_MAPPINGS: Record<string, string> = {
  "production operator": "Production Operative",
  "production operator - b": "Production Operative",
  "logisitcs": "Logistics",
  "logistics": "Logistics",
  "technical": "Technical",
  "shift leader": "Team Leader",
  "head of ict": "Head of ICT",
  "chief commerical officer": "Chief Commercial Officer",
  "chief commercial officer": "Chief Commercial Officer",
  "financial controller": "Financial Controller",
  "maintenance engineer": "Engineer",
  "cleaner": "Cleaner",
  "production operations manager": "Production Operations Manager",
  "quality technician": "Quality Technician",
  "quality assurance officer": "Quality Assurance Officer",
  "warehouse operative": "Warehouse Operative",
  "formulation support co-ordinator": "Formulation Support Co-ordinator",
  "general manager - pmr": "General Manager",
  "business development manager": "Business Development Manager",
  "quality control assistant": "Quality Control Assistant",
  "senior quality assurance officer": "Senior Quality Assurance Officer",
  "group cro": "Group CRO",
  "sales development": "Sales Development Representative",
  "formulation scientist & scale up lead": "Formulation Scientist",
  "concierge & account manager": "Concierge & Account Manager",
  "graphic designer": "Graphic Designer",
  "head of technical, quality & regulatory": "Head of Technical, Quality & Regulatory",
  "warehouse manager": "Warehouse Manager",
  "head of operations": "Head of Operations",
  "engineer": "Engineer",
};

// Helper function to map a job title
export function mapJobTitle(title: string): string {
  const normalized = title.toLowerCase().trim();
  if (JOB_TITLE_MAPPINGS[normalized]) {
    return JOB_TITLE_MAPPINGS[normalized];
  }
  // Check if it's already a valid title
  const exactMatch = JOB_TITLES.find(t => t.toLowerCase() === normalized);
  if (exactMatch) return exactMatch;
  // Return original if no mapping found
  return title;
}

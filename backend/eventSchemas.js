const baseRegistrationFields = () => ([
  { key: "full_name", label: "Full Name", type: "text", required: true },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "phone", label: "Phone", type: "text", required: false },
  { key: "roll_number", label: "Roll Number", type: "text", required: false },
  { key: "college_name", label: "College / Organization", type: "text", required: true },
  { key: "branch", label: "Branch", type: "text", required: false },
  { key: "department", label: "Department", type: "text", required: false },
  { key: "year_of_study", label: "Year of Study", type: "text", required: false },
]);

const hackathonRegistrationFields = (tracks) => ([
  { key: "github_id", label: "GitHub ID", type: "text", required: false },
  { key: "skills", label: "Skills", type: "text", required: false },
  {
    key: "track_selection",
    label: "Track Selection",
    type: tracks && tracks.length > 0 ? "select" : "text",
    required: false,
    options: tracks && tracks.length > 0 ? tracks : undefined,
  },
]);

const workshopRegistrationFields = () => ([
  { key: "prior_experience", label: "Prior Experience", type: "text", required: false },
]);

const festRegistrationFields = () => ([
  { key: "performance_category", label: "Performance Category", type: "text", required: false },
  {
    key: "team_type",
    label: "Team Type",
    type: "select",
    required: false,
    options: ["Solo", "Duo", "Group"],
  },
]);

const competitionRegistrationFields = () => ([
  { key: "experience", label: "Prior Experience", type: "text", required: false },
]);

function getRegistrationSchema(event) {
  const base = baseRegistrationFields();
  const type = (event?.event_type || "").toLowerCase();
  const participationType = event?.participation_type || null;
  const tracks = event?.event_config?.hackathon?.tracks || [];
  const fields = [...base];

  if (participationType === "team") {
    fields.push({ key: "team_name", label: "Team Name", type: "text", required: true });
    fields.push({ key: "team_members", label: "Team Members", type: "team_members", required: false });
  }

  if (type === "hackathon") fields.push(...hackathonRegistrationFields(tracks));
  if (type === "workshop") fields.push(...workshopRegistrationFields());
  if (type === "seminar" || type === "webinar") fields.push(...workshopRegistrationFields());
  if (type === "fest" || type === "cultural") fields.push(...festRegistrationFields());
  if (type === "competition") fields.push(...competitionRegistrationFields());

  return fields;
}

function validateRegistrationFormData(event, formData) {
  const errors = [];
  const schema = getRegistrationSchema(event);
  const data = formData && typeof formData === "object" ? formData : {};

  schema.forEach((field) => {
    const value = data[field.key];
    if (field.required) {
      const missing = value === undefined || value === null || String(value).trim() === "";
      const missingArray = Array.isArray(value) && value.length === 0;
      if (missing || missingArray) {
        errors.push(`${field.label} is required`);
        return;
      }
    }

    if (field.type === "email" && value) {
      const email = String(value).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Email is invalid");
      }
    }

    if (field.options && value) {
      if (Array.isArray(value)) {
        const invalid = value.filter((entry) => !field.options.includes(entry));
        if (invalid.length > 0) {
          errors.push(`${field.label} has invalid selections`);
        }
      } else if (!field.options.includes(value)) {
        errors.push(`${field.label} has invalid selection`);
      }
    }
  });

  return errors;
}

module.exports = {
  getRegistrationSchema,
  validateRegistrationFormData,
};

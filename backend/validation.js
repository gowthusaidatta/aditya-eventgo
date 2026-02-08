const isHttpUrl = (value) => /^https?:\/\//i.test(value);

const validateEventPayload = (payload) => {
  const errors = [];
  const mode = payload?.mode;

  if (mode && !["online", "offline", "hybrid"].includes(mode)) {
    errors.push("Invalid mode value");
  }

  if (mode && mode !== "online" && !payload?.location) {
    errors.push("Location is required for offline or hybrid events");
  }

  if (mode && mode !== "offline" && !payload?.online_link) {
    errors.push("Online link is required for online or hybrid events");
  }

  if (payload?.registration_deadline && payload?.start_date) {
    const deadline = new Date(payload.registration_deadline);
    const startDate = new Date(payload.start_date);
    if (deadline > startDate) {
      errors.push("Registration deadline must be before the start date");
    }
  }

  const website = payload?.venue_details?.website;
  if (website && !isHttpUrl(website)) {
    errors.push("Website URL must start with http:// or https://");
  }

  const hasTeamSizes = payload?.team_size_min !== undefined || payload?.team_size_max !== undefined;
  if (payload?.is_hackathon || hasTeamSizes) {
    const minSize = Number(payload?.team_size_min);
    const maxSize = Number(payload?.team_size_max);
    if (!Number.isFinite(minSize) || !Number.isFinite(maxSize) || minSize < 1 || maxSize < minSize) {
      errors.push("Invalid team size range");
    }
  }

  return errors;
};

module.exports = {
  validateEventPayload,
};

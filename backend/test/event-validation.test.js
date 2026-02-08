const test = require("node:test");
const assert = require("node:assert/strict");
const { validateEventPayload } = require("../validation");

test("validateEventPayload accepts a valid payload", () => {
  const errors = validateEventPayload({
    mode: "hybrid",
    location: "Campus Hall",
    online_link: "https://meet.example.com/event",
    start_date: "2026-02-10T10:00:00.000Z",
    registration_deadline: "2026-02-09T10:00:00.000Z",
    venue_details: { website: "https://example.com" },
    is_hackathon: true,
    team_size_min: 2,
    team_size_max: 5,
  });

  assert.deepEqual(errors, []);
});

test("validateEventPayload rejects invalid mode", () => {
  const errors = validateEventPayload({ mode: "virtual" });
  assert.ok(errors.includes("Invalid mode value"));
});

test("validateEventPayload requires location for offline or hybrid", () => {
  const errors = validateEventPayload({ mode: "offline" });
  assert.ok(errors.includes("Location is required for offline or hybrid events"));
});

test("validateEventPayload requires online link for online or hybrid", () => {
  const errors = validateEventPayload({ mode: "online" });
  assert.ok(errors.includes("Online link is required for online or hybrid events"));
});

test("validateEventPayload rejects late registration deadline", () => {
  const errors = validateEventPayload({
    start_date: "2026-02-10T10:00:00.000Z",
    registration_deadline: "2026-02-11T10:00:00.000Z",
  });
  assert.ok(errors.includes("Registration deadline must be before the start date"));
});

test("validateEventPayload rejects invalid website URL", () => {
  const errors = validateEventPayload({
    venue_details: { website: "www.example.com" },
  });
  assert.ok(errors.includes("Website URL must start with http:// or https://"));
});

test("validateEventPayload rejects invalid team sizes", () => {
  const errors = validateEventPayload({
    is_hackathon: true,
    team_size_min: 3,
    team_size_max: 2,
  });
  assert.ok(errors.includes("Invalid team size range"));
});

require("dotenv").config();

const BASE = (process.env.SMOKE_TEST_API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "");
const password = process.env.SEED_DEMO_PASSWORD || "DemoOnly123";
const patientEmail = process.env.SMOKE_TEST_PATIENT_EMAIL || "patient@janta-hospital.demo";
const staffEmail = process.env.SMOKE_TEST_STAFF_EMAIL || "sanjeev.aggarwal@janta-hospital.demo";
const failures = [];
const passes = [];

function pass(message) { passes.push(message); }
function fail(message) { failures.push(message); }

async function getJson(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function login(email, portal) {
  return getJson("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, portal }),
  });
}

async function main() {
  console.log(`Running non-destructive Janta Hospital API smoke tests against ${BASE}`);
  console.log("Demo credentials and JWTs will not be printed.\n");

  let health;
  try {
    health = await getJson("/api/health");
    if (health.response.status === 200 && health.data.database === "connected") pass("Health endpoint and database connection");
    else fail(`Health endpoint expected 200/database connected; got ${health.response.status}`);
  } catch (error) {
    throw new Error(`Cannot reach backend at ${BASE}: ${error.message}`);
  }

  const hospital = await getJson("/api/hospital");
  const slots = hospital.data?.booking?.slots || [];
  if (hospital.response.status === 200 && slots.some((s) => s.value === "MORNING") && slots.some((s) => s.value === "AFTERNOON")) {
    pass("Hospital configuration exposes both configurable booking slots");
  } else {
    fail(`Hospital configuration/slots incomplete (HTTP ${hospital.response.status})`);
  }

  const doctors = await getJson("/api/doctors");
  const names = (doctors.data || []).map((d) => d.user?.name);
  const required = ["Dr. Sanjeev Aggarwal", "Dr. Nidhi Aggarwal", "Dr. Virendra Aggarwal"];
  if (doctors.response.status === 200 && required.every((name) => names.includes(name))) pass("All three Janta Hospital doctor/service profiles load");
  else fail(`Doctor directory missing a required profile or returned HTTP ${doctors.response.status}`);

  for (const path of ["/api/appointments", "/api/queue"]) {
    const result = await getJson(path);
    if (result.response.status === 401) pass(`${path} rejects requests without authentication`);
    else fail(`${path} expected 401 without a token; got ${result.response.status}`);
  }

  const patientLogin = await login(patientEmail, "patient");
  const patient = patientLogin.data;
  if (patientLogin.response.status === 200 && patient.token && patient.user?.role === "PATIENT") pass("Patient portal authenticates as PATIENT");
  else fail(`Patient login failed (HTTP ${patientLogin.response.status}, role ${patient.user?.role || "missing"})`);

  const staffLogin = await login(staffEmail, "staff");
  const staff = staffLogin.data;
  if (staffLogin.response.status === 200 && staff.token && ["DOCTOR", "ADMIN"].includes(staff.user?.role)) pass("Staff portal authenticates as an authorized staff role");
  else fail(`Staff login failed (HTTP ${staffLogin.response.status}, role ${staff.user?.role || "missing"})`);

  const patientOnStaffPortal = await login(patientEmail, "staff");
  if (patientOnStaffPortal.response.status === 403) pass("Patient credentials cannot enter the staff portal");
  else fail(`Patient-on-staff-portal expected 403; got ${patientOnStaffPortal.response.status}`);

  const staffOnPatientPortal = await login(staffEmail, "patient");
  if (staffOnPatientPortal.response.status === 403) pass("Staff credentials cannot enter the patient portal");
  else fail(`Staff-on-patient-portal expected 403; got ${staffOnPatientPortal.response.status}`);

  if (patient.token) {
    const auth = { Authorization: `Bearer ${patient.token}` };
    const appts = await getJson("/api/appointments", { headers: auth });
    if (appts.response.status === 200 && Array.isArray(appts.data) && appts.data.every((item) => item.patientId === patient.user.id)) pass("Patient appointment history is scoped to that patient");
    else fail(`Patient appointments API/scope failed (HTTP ${appts.response.status})`);

    const queue = await getJson("/api/queue", { headers: auth });
    if (queue.response.status === 200 && Array.isArray(queue.data) && queue.data.every((item) => item.appointment?.patient?.id === patient.user.id)) pass("Patient queue response contains only their own tokens");
    else fail(`Patient queue API/privacy scope failed (HTTP ${queue.response.status})`);

    const queueAction = await getJson("/api/queue/1/action", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "next" }),
    });
    if (queueAction.response.status === 403) pass("Patient is denied staff queue actions");
    else fail(`Patient queue-action check expected 403; got ${queueAction.response.status}`);

    const bookingAsPatient = await getJson("/api/appointments", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (bookingAsPatient.response.status === 400) pass("Patient-only booking endpoint is reachable to a patient (invalid test body rejected)");
    else fail(`Patient booking validation expected 400 for empty body; got ${bookingAsPatient.response.status}`);
  }

  if (staff.token) {
    const auth = { Authorization: `Bearer ${staff.token}` };
    for (const path of ["/api/appointments", "/api/queue", "/api/notifications"]) {
      const response = await getJson(path, { headers: auth });
      if (response.response.status === 200 && Array.isArray(response.data)) pass(`Authorized staff can load ${path}`);
      else fail(`Authorized staff ${path} expected an array/200; got ${response.response.status}`);
    }

    const bookingAsStaff = await getJson("/api/appointments", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (bookingAsStaff.response.status === 403) pass("Staff accounts cannot create patient bookings");
    else fail(`Staff booking-role check expected 403; got ${bookingAsStaff.response.status}`);
  }

  console.log("\nPASSED:");
  for (const item of passes) console.log(`  PASS  ${item}`);
  if (failures.length) {
    console.log("\nFAILED:");
    for (const item of failures) console.log(`  FAIL  ${item}`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${passes.length} checks passed.`);
  }
}

main().catch((error) => {
  console.error(`Smoke test could not complete: ${error.message}`);
  process.exitCode = 1;
});

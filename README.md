# Janta Hospital — Smart Queue Management

Hospital-specific demo for **Janta Hospital, Jahangirabad**. This updates the existing React/Vite, Express, PostgreSQL and Prisma project rather than replacing the stack.

## Findings from the supplied source snapshot

- The public `GET /api/doctors` route returns an array, and the booking component also accepts an array; this is not a response-shape mismatch.
- The original Vite config had no `/api` proxy and the Express app had no CORS policy. The frontend called `http://localhost:5000` directly, so a browser-origin CORS failure could occur even when a direct HTTP request returned 200. The updated frontend uses relative `/api/...` requests in development, and Vite proxies them to port 5000.
- The original booking UI displayed hard-coded doctors/departments, but its submit handler searched the API result. It also omitted the now-required Bearer token from `POST /api/appointments`; backend authorization would reject booking.
- The original patient dashboard and queue page displayed hard-coded tokens and simulated queue movement/wait times. The updated pages use saved API data and avoid unsupported waiting-time estimates.
- The original queue action did a read followed by an unconditional update. The current action checks queue order and applies conditional updates in a serializable transaction, preventing two patients from being marked as serving in the same doctor/date/slot queue.
- The old schema did not have a qualifications field or a configurable consultation/diagnostic service mode. The additive migration introduces those fields without removing existing columns or rows.

## Hospital profiles

The seed configures these active profiles:

| Name | Service / specialization | Qualifications | Mode |
|---|---|---|---|
| Dr. Sanjeev Aggarwal | Child Specialist | MBBS, DCH | Consultation |
| Dr. Nidhi Aggarwal | Ultrasound | Not configured | Diagnostic; specific workflow not configured |
| Dr. Virendra Aggarwal | General Physician | Not configured | Consultation |

No qualifications beyond those supplied, consultation fees, room numbers, appointment durations, capacities, or availability schedules are invented. The patient UI offers configurable Morning (9:00 AM–12:00 PM) and Afternoon (2:00 PM–5:00 PM) slots. These are demo configuration defaults, not confirmation of Janta Hospital's actual operating hours; confirm them with staff before operational use. Waiting-time estimates remain unavailable until real service-time data is collected and a calculation is approved.

## Local setup

Prerequisites: Node.js 20.19+ (or 22.12+), npm, and a running PostgreSQL database. Use the existing database name/credentials where appropriate; do not overwrite an existing `.env` blindly.

1. In `backend/`, copy `.env.example` to `.env` and set `DATABASE_URL` and a unique `JWT_SECRET`. Keep `.env` private.
2. Install dependencies and apply the additive schema migration:

   ```bash
   cd backend
   npm ci
   npx prisma generate
   npm run db:migrate
   ```

3. For an isolated local/demo database only, configure the demo seed password if desired, then run:

   ```bash
   npm run db:seed
   npm run dev
   ```

   The seed upserts the three Janta provider accounts and a synthetic patient, disables legacy sample provider profiles, and revokes the old sample staff credentials. It does **not** create an appointment/queue token, nor delete old appointment or patient rows. Review its changes before pointing it at an important database.

4. In another terminal, start the frontend:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

   Open the exact localhost URL printed by Vite. If another application (such as Campus OS) already uses port `5173`, Vite may start this frontend at `http://localhost:5174/`. Patient login is `/login`; authorized staff login is `/staff-login`. The default backend origin is `http://localhost:5000`.

## Demo accounts

The local seed defaults to password `DemoOnly123` unless `SEED_DEMO_PASSWORD` is set. That password is only intended for isolated local testing and is hashed before storage. Use these accounts after seeding:

- Patient: `patient@janta-hospital.demo`
- Dr. Sanjeev Aggarwal: `sanjeev.aggarwal@janta-hospital.demo`
- Dr. Nidhi Aggarwal: `nidhi.aggarwal@janta-hospital.demo`
- Dr. Virendra Aggarwal: `virendra.aggarwal@janta-hospital.demo`

All of these synthetic accounts use the configured seed demo password. Patient self-registration can also be used. Public registration can create patient accounts only; doctor/staff roles cannot be assigned from the public form.

**Before any real deployment:** do not use these demo identities/passwords. Provision individual staff accounts, set a new random `JWT_SECRET`, use HTTPS, configure the exact `FRONTEND_ORIGIN`, and have the hospital review patient-data retention and authentication/session handling. This source update is a local pilot baseline, not a security certification or a substitute for deployment review.


## Controlled staff provisioning

The project does not expose a public staff-registration form or a browser-based administrator workflow. For a new staff account, a trusted operator with access to the backend `.env` can run `cd backend && npm run provision:staff` in an interactive terminal. The script prompts for the role, requires a hidden password of at least 12 characters, hashes the password, never changes existing accounts, and never creates a staff role through the public API. New doctor profiles are created unavailable until the hospital confirms their details. Choose an existing department only; the tool will not invent a new department.

For the supervised demo, the three synthetic doctor accounts are provisioned by the isolated local seed. They use `SEED_DEMO_PASSWORD` if set, otherwise the local-only default documented above. Never expose these demo accounts to the public internet or use their shared password for real staff.

## Environment settings

- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: required signing key; do not use the placeholder value.
- `PORT`: backend port (defaults to `5000`).
- `HOSPITAL_NAME` / `HOSPITAL_LOCATION`: public branding defaults.
- `FRONTEND_ORIGIN`: comma-separated, exact allowed browser origins for direct cross-origin deployments. In local development, Vite's same-origin proxy is preferred.
- `ENABLE_QUEUE_SKIP`: defaults to `false`. Set to `true` only after the hospital approves the skip workflow.
- `MORNING_SLOT_ENABLED`, `MORNING_SLOT_LABEL`, `MORNING_SLOT_TIME`: configure the morning slot.
- `AFTERNOON_SLOT_ENABLED`, `AFTERNOON_SLOT_LABEL`, `AFTERNOON_SLOT_TIME`: configure the afternoon slot.
- `EMERGENCY_SURCHARGE`: emergency surcharge in rupees; defaults to `500`. The app does not collect payment and does not mark the surcharge as paid.
- `SEED_DEMO_PASSWORD`: optional seed password. Do not set a real user password here.
- `VITE_API_BASE_URL`: leave empty locally; for a separately deployed frontend, set it to the backend origin without a trailing slash.

## Workflow and data safety

- Only authenticated patients can create token requests. Patients can view only their own appointment and queue records.
- Doctors see records assigned to their linked doctor profile. Admins can see all records and filter the dashboard by doctor/service.
- Queue transitions are `WAITING → SERVING → COMPLETED`; `WAITING → SKIPPED` is available only when `ENABLE_QUEUE_SKIP=true`. Emergency tokens cannot be called until an authorized doctor/admin approves them.
- Only one token may be serving for a specific doctor/service, booking date, and slot at a time. The API verifies that the selected token is the next eligible token, then uses a conditional update and serializable transaction to reject stale/concurrent transitions.
- Patient queue responses include counts/status, not other patients' names. Staff can view the minimum patient name needed to run the queue; patient emails are not included in appointment responses.
- The ultrasound service is marked `DIAGNOSTIC`, but its operating workflow is intentionally not inferred. Confirm the real process before using it operationally.
- The patient-facing UI collects no phone number. Do not use real patient data for initial testing.
- The pilot frontend keeps the short-lived bearer token in `sessionStorage`; this is still JavaScript-readable. Before any internet-facing or real-patient deployment, move authentication to an approved secure session design (preferably an HTTPS-only, `HttpOnly`, `Secure`, appropriately `SameSite` cookie), add rate limiting and monitoring, and complete a security/privacy review.

## API smoke checks

After the pending migration is applied, Prisma Client is generated, and the backend is running, run the non-destructive API checks from `backend/`:

```bash
npm run smoke:local
```

The script uses the synthetic seeded patient/staff credentials from `SEED_DEMO_PASSWORD` (or the local-only `DemoOnly123` default) and does not print the password or JWT. It checks doctor profiles, login portal separation, role restrictions, patient record scoping, and protected endpoints. It makes no valid booking or queue mutation. A successful smoke test is necessary but not sufficient for deployment; the normal booking, emergency approval, and queue transitions must still be tested in the browser against the actual database.

For direct endpoint checks, run:

```bash
curl -i http://localhost:5000/api/health
curl -i http://localhost:5000/api/hospital
curl -i http://localhost:5000/api/doctors
curl -i http://localhost:5000/api/appointments   # should be 401 without a token
curl -i http://localhost:5000/api/queue          # should be 401 without a token
```

If using direct browser-to-backend requests instead of the Vite proxy, set `FRONTEND_ORIGIN` to the exact frontend origin(s). A direct HTTP 200 from curl alone does not prove that browser CORS is configured correctly.


## Slot and emergency behaviour

- Bookings are separated by doctor/service, India-local booking date, and slot using an atomic per-group sequence. Token labels include provider/date/slot so separate queues don't collide.
- Emergency bookings create a persistent pending-review status and a notification for the assigned doctor. Only the linked doctor or an administrator may approve/decline. A pending emergency cannot be called by the queue action API. Approval promotes its queue priority; decline cancels its queue entry.
- ₹500 is a configurable surcharge display, not proof of payment. The normal fee is shown as not configured. The UI warns users not to wait for app approval during a serious or life-threatening emergency.
- Patient APIs are scoped to the logged-in patient; the patient queue response contains no other patients' identities. Staff queue controls and emergency decisions are authorized again in the backend.

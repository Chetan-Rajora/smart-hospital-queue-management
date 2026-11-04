require("dotenv").config();
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "DemoOnly123";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Demo seed refused in production. Set ALLOW_DEMO_SEED=true only in an isolated test environment.");
  }

  if (Buffer.byteLength(DEMO_PASSWORD, "utf8") > 72 || DEMO_PASSWORD.length < 8) {
    throw new Error("SEED_DEMO_PASSWORD must be at least 8 characters and no more than 72 UTF-8 bytes.");
  }

  const departmentDefinitions = [
    { name: "Pediatrics", description: "Child Specialist service" },
    { name: "Ultrasound", description: "Diagnostic service; detailed workflow not configured" },
    { name: "General Medicine", description: "General Physician service" },
  ];
  const departments = {};
  for (const definition of departmentDefinitions) {
    departments[definition.name] = await db.department.upsert({
      where: { name: definition.name },
      update: { description: definition.description },
      create: definition,
    });
  }

  // Retire only the old sample providers from the public directory. Their historical
  // appointments are retained for auditability; no patient or appointment is deleted.
  const legacyUsers = await db.user.findMany({
    where: { email: { in: ["anil@hospital.demo", "priya@hospital.demo", "rahul@hospital.demo"] } },
    select: { id: true },
  });
  if (legacyUsers.length) {
    const legacyIds = legacyUsers.map((user) => user.id);
    await db.doctor.updateMany({
      where: { userId: { in: legacyIds } },
      data: { availability: false },
    });
    // These were demo-only staff accounts from the previous sample project.
    // Revoke their old credentials and remove staff-role access without deleting history.
    await db.user.updateMany({
      where: { id: { in: legacyIds } },
      data: {
        role: "PATIENT",
        password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12),
      },
    });
  }

  const patientPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await db.user.upsert({
    where: { email: "patient@janta-hospital.demo" },
    update: { name: "Demo Patient", password: patientPasswordHash, role: "PATIENT" },
    create: {
      name: "Demo Patient",
      email: "patient@janta-hospital.demo",
      password: patientPasswordHash,
      role: "PATIENT",
    },
  });

  const profiles = [
    {
      name: "Dr. Sanjeev Aggarwal",
      email: "sanjeev.aggarwal@janta-hospital.demo",
      department: "Pediatrics",
      specialization: "Child Specialist",
      qualifications: "MBBS, DCH",
      serviceMode: "CONSULTATION",
    },
    {
      name: "Dr. Nidhi Aggarwal",
      email: "nidhi.aggarwal@janta-hospital.demo",
      department: "Ultrasound",
      specialization: "Ultrasound",
      qualifications: null,
      serviceMode: "DIAGNOSTIC",
    },
    {
      name: "Dr. Virendra Aggarwal",
      email: "virendra.aggarwal@janta-hospital.demo",
      department: "General Medicine",
      specialization: "General Physician",
      qualifications: null,
      serviceMode: "CONSULTATION",
    },
  ];

  for (const profile of profiles) {
    const profilePasswordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const user = await db.user.upsert({
      where: { email: profile.email },
      update: { name: profile.name, password: profilePasswordHash, role: "DOCTOR" },
      create: {
        name: profile.name,
        email: profile.email,
        password: profilePasswordHash,
        role: "DOCTOR",
      },
    });
    await db.doctor.upsert({
      where: { userId: user.id },
      update: {
        departmentId: departments[profile.department].id,
        specialization: profile.specialization,
        qualifications: profile.qualifications,
        serviceMode: profile.serviceMode,
        availability: true,
      },
      create: {
        userId: user.id,
        departmentId: departments[profile.department].id,
        specialization: profile.specialization,
        qualifications: profile.qualifications,
        serviceMode: profile.serviceMode,
        availability: true,
      },
    });
  }

  console.log("\nJanta Hospital demo profiles configured");
  console.log("Hospital: Janta Hospital, Jahangirabad");
  console.log("Active Janta profiles:", await db.doctor.count({ where: { availability: true, user: { is: { email: { endsWith: "@janta-hospital.demo" } } } } }));
  console.log("Demo patient: patient@janta-hospital.demo");
  console.log("Demo password: controlled by SEED_DEMO_PASSWORD (local default: DemoOnly123)");
  console.log("No appointments, queues, or historical patient records were deleted or created by this seed.");
}

main()
  .catch((error) => {
    console.error("Janta Hospital seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());

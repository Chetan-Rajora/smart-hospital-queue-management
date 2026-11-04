require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const stdin = process.stdin;
const stdout = process.stdout;

function ask(prompt, { hidden = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
      reject(new Error("Run this provisioning script interactively in a trusted terminal."));
      return;
    }

    stdout.write(prompt);
    let value = "";
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };

    const onData = (buffer) => {
      for (const character of buffer.toString("utf8")) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Provisioning cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value.trim());
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          if (!hidden) stdout.write("\b \b");
          continue;
        }
        if (character < " ") continue;
        value += character;
        if (!hidden) stdout.write(character);
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured in backend/.env.");

  console.log("Janta Hospital — controlled staff account provisioning");
  console.log("Only run this locally as a trusted operator with backend database access.\n");

  const name = await ask("Full name: ");
  const email = (await ask("Staff email: ")).toLowerCase();
  const role = (await ask("Role (DOCTOR or ADMIN): ")).toUpperCase();

  if (!name || name.length > 100) throw new Error("Enter a name of 1–100 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Enter a valid email address.");
  if (!["DOCTOR", "ADMIN"].includes(role)) throw new Error("Only DOCTOR or ADMIN roles can be provisioned by this script.");

  let doctorProfile = null;
  if (role === "DOCTOR") {
    const departmentName = await ask("Existing department name (exact): ");
    const specialization = await ask("Specialization/service: ");
    const qualifications = await ask("Qualifications (leave blank if unconfirmed): ");
    const serviceMode = (await ask("Service mode (CONSULTATION or DIAGNOSTIC): ")).toUpperCase();

    if (!departmentName || !specialization || specialization.length > 120) {
      throw new Error("Doctor department and specialization are required.");
    }
    if (!["CONSULTATION", "DIAGNOSTIC"].includes(serviceMode)) {
      throw new Error("Service mode must be CONSULTATION or DIAGNOSTIC.");
    }
    if (qualifications.length > 200) throw new Error("Qualifications text is too long.");
    const department = await prisma.department.findUnique({ where: { name: departmentName }, select: { id: true, name: true } });
    if (!department) throw new Error("That department does not exist. Provisioning does not create unconfirmed departments.");
    doctorProfile = { department, specialization, qualifications: qualifications || null, serviceMode };
  }

  const password = await ask("New password (input hidden; minimum 12 characters): ", { hidden: true });
  const confirmation = await ask("Confirm password (input hidden): ", { hidden: true });
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Password must be at least 12 characters and no more than 72 UTF-8 bytes.");
  }
  if (password !== confirmation) throw new Error("Passwords do not match.");

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new Error("That email already exists. This script does not change existing accounts or roles.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      role,
      ...(doctorProfile ? {
        doctor: {
          create: {
            specialization: doctorProfile.specialization,
            qualifications: doctorProfile.qualifications,
            serviceMode: doctorProfile.serviceMode,
            availability: false,
            department: { connect: { id: doctorProfile.department.id } },
          },
        },
      } : {}),
    },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log("\nStaff account provisioned:");
  console.log(`Name: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
  if (doctorProfile) console.log("Doctor profile created with availability disabled until confirmed by the hospital.");
  console.log("Password was hashed before storage and was not displayed.");
}

main()
  .catch((error) => {
    console.error(`Staff provisioning failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

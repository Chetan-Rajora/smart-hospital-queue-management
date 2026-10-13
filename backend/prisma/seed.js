
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const departments = {};
  for (const name of [
    "General Medicine", "Cardiology", "Orthopedics",
    "Dermatology", "Pediatrics"
  ]) {
    departments[name] = await db.department.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} department` }
    });
  }

  const patient = await db.user.upsert({
    where: { email: "patient@hospital.demo" },
    update: {},
    create: {
      name: "Aarav Sharma",
      email: "patient@hospital.demo",
      password: "DemoOnly123",
      role: "PATIENT"
    }
  });

  const records = [
    ["Dr. Anil Sharma", "anil@hospital.demo", "Cardiology", "Cardiologist"],
    ["Dr. Priya Verma", "priya@hospital.demo", "General Medicine", "General Physician"],
    ["Dr. Rahul Mehta", "rahul@hospital.demo", "Orthopedics", "Orthopedic Specialist"]
  ];

  const doctors = [];
  for (const [name, email, department, specialization] of records) {
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: {
        name, email, password: "DemoOnly123", role: "DOCTOR"
      }
    });

    doctors.push(await db.doctor.upsert({
      where: { userId: user.id },
      update: {
        departmentId: departments[department].id,
        specialization,
        availability: true
      },
      create: {
        userId: user.id,
        departmentId: departments[department].id,
        specialization,
        availability: true
      }
    }));
  }

  let appointment = await db.appointment.findFirst({
    where: { patientId: patient.id }
  });

  if (!appointment) {
    appointment = await db.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctors[1].id,
        appointmentDate: new Date(),
        appointmentTime: "10:30 AM",
        status: "CONFIRMED"
      }
    });
  }

  await db.queue.upsert({
    where: { appointmentId: appointment.id },
    update: {},
    create: {
      appointmentId: appointment.id,
      tokenNumber: `A-${String(appointment.id).padStart(3, "0")}`,
      priority: "NORMAL",
      status: "WAITING"
    }
  });

  console.log("\n✅ DEMO DATABASE READY");
  console.log("Departments:", await db.department.count());
  console.log("Users:", await db.user.count());
  console.log("Doctors:", await db.doctor.count());
  console.log("Appointments:", await db.appointment.count());
  console.log("Queue tokens:", await db.queue.count());
}

main()
  .catch(error => {
    console.error("SEED ERROR:", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());


const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();
const PORT = 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Smart Hospital Queue API is running" });
});

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, database: "connected" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/departments", async (req, res) => {
  try {
    res.json(await prisma.department.findMany({ orderBy: { name: "asc" } }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/doctors", async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { availability: true },
      include: {
        user: { select: { id: true, name: true, email: true } },
        department: true
      }
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/appointments", async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: {
          include: {
            user: { select: { name: true } },
            department: true
          }
        },
        queue: true
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/appointments", async (req, res) => {
  try {
    const { doctorId, appointmentDate, appointmentTime } = req.body;

    if (!doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        error: "doctorId, appointmentDate and appointmentTime are required"
      });
    }

    const date = new Date(appointmentDate);
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ error: "Invalid appointmentDate" });
    }

    const patient = await prisma.user.findUnique({
      where: { email: "patient@hospital.demo" }
    });

    if (!patient) {
      return res.status(400).json({ error: "Demo patient not found" });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: Number(doctorId) }
    });

    if (!doctor || !doctor.availability) {
      return res.status(404).json({ error: "Available doctor not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          appointmentDate: date,
          appointmentTime: String(appointmentTime),
          status: "CONFIRMED"
        }
      });

      const queue = await tx.queue.create({
        data: {
          appointmentId: appointment.id,
          tokenNumber: `A-${String(appointment.id).padStart(3, "0")}`,
          priority: "NORMAL",
          status: "WAITING"
        }
      });

      return { ...appointment, queue };
    });

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment: result
    });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ error: "Could not book appointment" });
  }
});

app.get("/api/queue", async (req, res) => {
  try {
    const queue = await prisma.queue.findMany({
      include: {
        appointment: {
          include: {
            patient: { select: { name: true } },
            doctor: {
              include: {
                user: { select: { name: true } },
                department: true
              }
            }
          }
        }
      },
      orderBy: { joinedAt: "asc" }
    });
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post("/api/queue/:id/action", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { action } = req.body;

    const item = await prisma.queue.findUnique({
      where: { id }
    });

    if (!item) {
      return res.status(404).json({ error: "Queue token not found" });
    }

    let status;

    if (action === "next" && item.status === "WAITING") {
      status = "SERVING";
    } else if (action === "complete" && item.status === "SERVING") {
      status = "COMPLETED";
    } else if (action === "skip" && item.status === "WAITING") {
      status = "SKIPPED";
    } else {
      return res.status(400).json({
        error: "Action not valid for current token status"
      });
    }

    const updated = await prisma.queue.update({
      where: { id },
      data: {
        status,
        ...(status === "SERVING" ? { servedAt: new Date() } : {})
      }
    });

    if (status === "COMPLETED" || status === "SKIPPED") {
      await prisma.appointment.update({
        where: { id: item.appointmentId },
        data: {
          status: status === "COMPLETED" ? "COMPLETED" : "CONFIRMED"
        }
      });
    }

    res.json({ success: true, queue: updated });
  } catch (error) {
    console.error("Queue action error:", error);
    res.status(500).json({ error: "Queue action failed" });
  }
});


const server = app.listen(PORT, () => {
  console.log(`Hospital API running at http://localhost:${PORT}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

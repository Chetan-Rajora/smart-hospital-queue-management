require("dotenv").config();

const express = require("express");
const { Prisma } = require("@prisma/client");
const prisma = require("./config/prisma");
const {
  authenticateToken,
  authorizeRoles,
} = require("./middleware/authMiddleware");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOSPITAL_NAME = process.env.HOSPITAL_NAME || "Janta Hospital";
const HOSPITAL_LOCATION = process.env.HOSPITAL_LOCATION || "Jahangirabad";
const ENABLE_QUEUE_SKIP = process.env.ENABLE_QUEUE_SKIP === "true";
const configuredSurcharge = Number(process.env.EMERGENCY_SURCHARGE ?? "500");
const EMERGENCY_SURCHARGE = Number.isInteger(configuredSurcharge) && configuredSurcharge >= 0
  ? configuredSurcharge
  : 500;
const normalFeeRaw = process.env.NORMAL_BOOKING_FEE;
const configuredNormalFee = normalFeeRaw === undefined || normalFeeRaw.trim() === "" ? null : Number(normalFeeRaw);
const NORMAL_BOOKING_FEE = Number.isInteger(configuredNormalFee) && configuredNormalFee >= 0
  ? configuredNormalFee
  : null;
const BOOKING_SLOTS = [
  {
    value: "MORNING",
    label: process.env.MORNING_SLOT_LABEL || "Morning · 9:00 AM–12:00 PM",
    timeRange: process.env.MORNING_SLOT_TIME || "9:00 AM–12:00 PM",
    enabled: process.env.MORNING_SLOT_ENABLED !== "false",
  },
  {
    value: "AFTERNOON",
    label: process.env.AFTERNOON_SLOT_LABEL || "Afternoon · 2:00 PM–5:00 PM",
    timeRange: process.env.AFTERNOON_SLOT_TIME || "2:00 PM–5:00 PM",
    enabled: process.env.AFTERNOON_SLOT_ENABLED !== "false",
  },
];
const ENABLED_BOOKING_SLOTS = BOOKING_SLOTS.filter((slot) => slot.enabled);

function indiaDateString() {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}
const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  const localDevelopmentOrigin = process.env.NODE_ENV !== "production" &&
    typeof origin === "string" &&
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  if (origin && !allowedOrigins.has(origin) && !localDevelopmentOrigin) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "20kb" }));
app.use("/api/auth", require("./routes/authRoutes"));

app.get("/", (req, res) => {
  res.json({ message: `${HOSPITAL_NAME} Queue Management API is running` });
});

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.status(500).json({ success: false, database: "unavailable" });
  }
});

app.get("/api/hospital", (req, res) => {
  res.json({
    name: HOSPITAL_NAME,
    location: HOSPITAL_LOCATION,
    queueActions: { allowSkip: ENABLE_QUEUE_SKIP },
    booking: {
      slots: ENABLED_BOOKING_SLOTS.map(({ value, label, timeRange }) => ({ value, label, timeRange })),
      normalFee: NORMAL_BOOKING_FEE,
      emergencySurcharge: EMERGENCY_SURCHARGE,
      timezone: "Asia/Kolkata",
    },
  });
});

// The public directory intentionally omits emails and other account details.
app.get("/api/departments", async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { doctors: { some: { availability: true } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    });
    res.json(departments);
  } catch (error) {
    console.error("Departments error:", error.message);
    res.status(500).json({ error: "Could not load departments" });
  }
});

app.get("/api/doctors", async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { availability: true },
      orderBy: [{ department: { name: "asc" } }, { user: { name: "asc" } }],
      select: {
        id: true,
        specialization: true,
        qualifications: true,
        serviceMode: true,
        availability: true,
        user: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, description: true } },
      },
    });
    res.json(doctors);
  } catch (error) {
    console.error("Doctors error:", error.message);
    res.status(500).json({ error: "Could not load doctors" });
  }
});

// Patients see their own records, doctors see their assigned records, admins see all.
app.get("/api/appointments", authenticateToken, async (req, res) => {
  try {
    const where = {};

    if (req.user.role === "PATIENT") {
      where.patientId = req.user.id;
    } else if (req.user.role === "DOCTOR") {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });

      if (!doctor) {
        return res.status(403).json({ error: "No doctor profile is linked to this account" });
      }
      where.doctorId = doctor.id;
    } else if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        doctor: {
          include: {
            user: { select: { id: true, name: true } },
            department: true,
          },
        },
        queue: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(appointments);
  } catch (error) {
    console.error("Appointments error:", error.message);
    res.status(500).json({ error: "Could not load appointments" });
  }
});

app.post(
  "/api/appointments",
  authenticateToken,
  authorizeRoles("PATIENT"),
  async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const doctorId = Number(body.doctorId);
      const appointmentDate = body.appointmentDate;
      const slotValue = body.slot;
      const bookingType = body.bookingType === undefined ? "NORMAL" : body.bookingType;
      const slot = ENABLED_BOOKING_SLOTS.find((candidate) => candidate.value === slotValue);

      if (
        !Number.isInteger(doctorId) || doctorId <= 0 ||
        typeof appointmentDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) ||
        !slot ||
        !["NORMAL", "EMERGENCY"].includes(bookingType)
      ) {
        return res.status(400).json({
          error: "Select an available doctor/service, a valid date, a configured time slot, and a booking type.",
        });
      }

      const [year, month, day] = appointmentDate.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (
        Number.isNaN(date.getTime()) ||
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        return res.status(400).json({ error: "Invalid appointment date" });
      }
      if (appointmentDate < indiaDateString()) {
        return res.status(400).json({ error: "Appointment date cannot be in the past" });
      }

      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true, userId: true, availability: true },
      });
      if (!doctor || !doctor.availability) {
        return res.status(404).json({ error: "Available doctor/service not found" });
      }

      const emergency = bookingType === "EMERGENCY";
      const surchargeAmount = emergency ? EMERGENCY_SURCHARGE : 0;
      const result = await prisma.$transaction(async (tx) => {
        const duplicate = await tx.appointment.findFirst({
          where: {
            patientId: req.user.id,
            doctorId: doctor.id,
            appointmentDate: date,
            slot: slot.value,
            status: { in: ["BOOKED", "CONFIRMED"] },
          },
          select: { id: true },
        });
        if (duplicate) return { duplicate: true };

        const sequence = await tx.queueSequence.upsert({
          where: {
            doctorId_appointmentDate_slot: {
              doctorId: doctor.id,
              appointmentDate: date,
              slot: slot.value,
            },
          },
          update: { lastNumber: { increment: 1 } },
          create: {
            doctorId: doctor.id,
            appointmentDate: date,
            slot: slot.value,
            lastNumber: 1,
          },
          select: { lastNumber: true },
        });
        const dateStamp = appointmentDate.replaceAll("-", "");
        const slotStamp = slot.value === "MORNING" ? "M" : "A";
        const tokenNumber = `JH-D${String(doctor.id).padStart(2, "0")}-${dateStamp}-${slotStamp}-${String(sequence.lastNumber).padStart(3, "0")}`;

        const appointment = await tx.appointment.create({
          data: {
            patientId: req.user.id,
            doctorId: doctor.id,
            appointmentDate: date,
            appointmentTime: slot.timeRange,
            slot: slot.value,
            bookingType,
            emergencyStatus: emergency ? "PENDING" : "NOT_APPLICABLE",
            surchargeAmount,
            status: "BOOKED",
          },
        });

        const queue = await tx.queue.create({
          data: {
            appointmentId: appointment.id,
            tokenNumber,
            priority: emergency ? "EMERGENCY" : "NORMAL",
            status: "WAITING",
          },
        });

        if (emergency) {
          await tx.notification.create({
            data: {
              userId: doctor.userId,
              type: "APPOINTMENT",
              message: `Emergency request ${tokenNumber} needs staff review. The request is pending; the surcharge is not recorded as paid.`,
            },
          });
        }

        return { appointment: { ...appointment, queue } };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      if (result.duplicate) {
        return res.status(409).json({
          error: "A request already exists for this doctor/service, date, and slot.",
        });
      }

      const message = emergency
        ? `Emergency request ${result.appointment.queue.tokenNumber} is saved and pending doctor/staff review. The ₹${surchargeAmount} surcharge is not marked as paid. For a serious or life-threatening emergency, seek immediate in-person care; do not wait for app approval.`
        : `Token request created for the ${slot.label} slot. The selected slot is a request and remains subject to hospital confirmation.`;

      res.status(201).json({
        success: true,
        message,
        appointment: result.appointment,
        booking: { type: bookingType, slot: slot.value, normalFee: NORMAL_BOOKING_FEE, surchargeAmount, totalAmount: NORMAL_BOOKING_FEE === null ? null : NORMAL_BOOKING_FEE + surchargeAmount, paymentStatus: "NOT_INTEGRATED" },
      });
    } catch (error) {
      if (error.code === "P2034" || error.code === "P2002") {
        return res.status(409).json({ error: "A conflicting booking was detected. Please refresh and try again." });
      }
      console.error("Booking error:", error.message);
      res.status(500).json({ error: "Could not create token request" });
    }
  }
);

app.get("/api/queue", authenticateToken, async (req, res) => {
  try {
    const where = {};
    let patientMode = false;

    if (req.user.role === "PATIENT") {
      patientMode = true;
      where.appointment = { is: { patientId: req.user.id } };
    } else if (req.user.role === "DOCTOR") {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (!doctor) {
        return res.status(403).json({ error: "No doctor profile is linked to this account" });
      }
      where.appointment = { is: { doctorId: doctor.id } };
    } else if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    const queue = await prisma.queue.findMany({
      where,
      include: {
        appointment: {
          include: {
            patient: { select: { id: true, name: true } },
            doctor: {
              include: {
                user: { select: { id: true, name: true } },
                department: true,
              },
            },
          },
        },
      },
      orderBy: [{ priority: "desc" }, { joinedAt: "asc" }, { id: "asc" }],
    });

    if (!patientMode) {
      return res.json(queue);
    }

    // Return queue counts only; never expose other patients' identities to a patient.
    const enriched = await Promise.all(queue.map(async (item) => {
      const doctorId = item.appointment.doctorId;
      const dateSlot = {
        doctorId,
        appointmentDate: item.appointment.appointmentDate,
        slot: item.appointment.slot,
      };
      const pendingEmergency = item.appointment.bookingType === "EMERGENCY" && item.appointment.emergencyStatus === "PENDING";
      let peopleAhead = 0;
      if (item.status === "WAITING" && !pendingEmergency) {
        const earlier = [
          { joinedAt: { lt: item.joinedAt } },
          { joinedAt: item.joinedAt, id: { lt: item.id } },
        ];
        if (item.priority === "EMERGENCY") {
          peopleAhead = await prisma.queue.count({
            where: {
              status: { in: ["WAITING", "SERVING"] },
              priority: "EMERGENCY",
              appointment: { is: { ...dateSlot, emergencyStatus: "APPROVED" } },
              OR: earlier,
            },
          });
        } else {
          peopleAhead = await prisma.queue.count({
            where: {
              status: { in: ["WAITING", "SERVING"] },
              appointment: { is: dateSlot },
              OR: [
                { priority: "EMERGENCY", appointment: { is: { ...dateSlot, emergencyStatus: "APPROVED" } } },
                { priority: "NORMAL", OR: earlier },
              ],
            },
          });
        }
      } else if (pendingEmergency) {
        peopleAhead = null;
      }
      const serving = await prisma.queue.findFirst({
        where: { status: "SERVING", appointment: { is: dateSlot } },
        select: { tokenNumber: true },
      });
      return {
        ...item,
        peopleAhead,
        currentlyServingToken: serving?.tokenNumber || null,
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error("Queue error:", error.message);
    res.status(500).json({ error: "Could not load queue" });
  }
});

app.post(
  "/api/queue/:id/action",
  authenticateToken,
  authorizeRoles("DOCTOR", "ADMIN"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const action = req.body && typeof req.body === "object" ? req.body.action : undefined;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid queue ID" });
      }
      if (!["next", "complete", "skip"].includes(action)) {
        return res.status(400).json({ error: "Unsupported queue action" });
      }
      if (action === "skip" && !ENABLE_QUEUE_SKIP) {
        return res.status(403).json({ error: "Skipping patients is disabled until the hospital approves this workflow" });
      }

      const outcome = await prisma.$transaction(async (tx) => {
        const item = await tx.queue.findUnique({
          where: { id },
          include: { appointment: { include: { doctor: true } } },
        });
        if (!item) return { kind: "not-found" };

        if (req.user.role === "DOCTOR" && item.appointment.doctor.userId !== req.user.id) {
          return { kind: "forbidden" };
        }

        let nextStatus;
        if (action === "next" && item.appointment.slot == null) {
          return { kind: "legacy-no-slot" };
        }
        if (action === "next" && item.appointment.bookingType === "EMERGENCY" && item.appointment.emergencyStatus !== "APPROVED") {
          return { kind: "emergency-pending" };
        }
        if (action === "next" && item.status === "WAITING") {
          const queueContext = {
            doctorId: item.appointment.doctorId,
            appointmentDate: item.appointment.appointmentDate,
            slot: item.appointment.slot,
          };
          const current = await tx.queue.findFirst({
            where: {
              status: "SERVING",
              appointment: { is: queueContext },
              id: { not: item.id },
            },
            select: { id: true },
          });
          if (current) return { kind: "already-serving" };

          // The API independently enforces queue order rather than relying on UI ordering.
          // Pending emergency requests are excluded until a staff member approves them.
          const expectedNext = await tx.queue.findFirst({
            where: {
              status: "WAITING",
              appointment: {
                is: {
                  ...queueContext,
                  OR: [
                    { bookingType: { not: "EMERGENCY" } },
                    { bookingType: "EMERGENCY", emergencyStatus: "APPROVED" },
                  ],
                },
              },
            },
            orderBy: [{ priority: "desc" }, { joinedAt: "asc" }, { id: "asc" }],
            select: { id: true },
          });
          if (!expectedNext || expectedNext.id !== item.id) return { kind: "not-next" };
          nextStatus = "SERVING";
        } else if (action === "complete" && item.status === "SERVING") {
          nextStatus = "COMPLETED";
        } else if (action === "skip" && item.status === "WAITING") {
          nextStatus = "SKIPPED";
        } else {
          return { kind: "invalid-transition" };
        }

        // Conditional update prevents two clients from applying the same transition.
        const changed = await tx.queue.updateMany({
          where: { id: item.id, status: item.status },
          data: {
            status: nextStatus,
            ...(nextStatus === "SERVING" ? { servedAt: new Date() } : {}),
          },
        });
        if (changed.count !== 1) return { kind: "conflict" };

        if (nextStatus === "SERVING") {
          await tx.appointment.update({
            where: { id: item.appointmentId },
            data: { status: "CONFIRMED" },
          });
        } else if (nextStatus === "COMPLETED") {
          await tx.appointment.update({
            where: { id: item.appointmentId },
            data: { status: "COMPLETED" },
          });
        } else if (nextStatus === "SKIPPED") {
          await tx.appointment.update({
            where: { id: item.appointmentId },
            data: { status: "NO_SHOW" },
          });
        }

        return {
          kind: "ok",
          queue: await tx.queue.findUnique({ where: { id: item.id } }),
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      if (outcome.kind === "not-found") return res.status(404).json({ error: "Queue token not found" });
      if (outcome.kind === "forbidden") return res.status(403).json({ error: "You can only manage your own patients" });
      if (outcome.kind === "already-serving") return res.status(409).json({ error: "A patient is already being served for this doctor/service, date, and slot" });
      if (outcome.kind === "not-next") return res.status(409).json({ error: "This is not the next eligible token for this date and slot. Refresh the queue and try again." });
      if (outcome.kind === "legacy-no-slot") return res.status(409).json({ error: "This legacy request has no configured slot. Confirm its intended queue with hospital staff before calling it." });
      if (outcome.kind === "emergency-pending") return res.status(409).json({ error: "Emergency request must be approved by authorized staff before it can be called" });
      if (outcome.kind === "invalid-transition") return res.status(400).json({ error: "Action not valid for current token status" });
      if (outcome.kind === "conflict") return res.status(409).json({ error: "Queue status changed in another session. Refresh and try again." });

      res.json({ success: true, queue: outcome.queue });
    } catch (error) {
      if (error.code === "P2034") {
        return res.status(409).json({ error: "Concurrent queue update detected. Refresh and try again." });
      }
      console.error("Queue action error:", error.message);
      res.status(500).json({ error: "Queue action failed" });
    }
  }
);


app.get("/api/notifications", authenticateToken, authorizeRoles("DOCTOR", "ADMIN"), async (req, res) => {
  try {
    const where = req.user.role === "DOCTOR"
      ? { userId: req.user.id }
      : { type: "APPOINTMENT", user: { is: { role: "DOCTOR" } } };
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, message: true, type: true, isRead: true, createdAt: true },
    });
    res.json(notifications);
  } catch (error) {
    console.error("Notifications error:", error.message);
    res.status(500).json({ error: "Could not load staff notifications" });
  }
});

app.patch("/api/notifications/:id/read", authenticateToken, authorizeRoles("DOCTOR", "ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid notification ID" });
    const notification = await prisma.notification.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    if (req.user.role !== "ADMIN" && notification.userId !== req.user.id) {
      return res.status(403).json({ error: "You cannot update this notification" });
    }
    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true });
  } catch (error) {
    console.error("Notification update error:", error.message);
    res.status(500).json({ error: "Could not update notification" });
  }
});

app.post("/api/appointments/:id/emergency-decision", authenticateToken, authorizeRoles("DOCTOR", "ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const decision = req.body?.decision;
    if (!Number.isInteger(id) || id <= 0 || !["approve", "decline"].includes(decision)) {
      return res.status(400).json({ error: "Choose approve or decline for a valid emergency request" });
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id },
        include: { doctor: { select: { id: true, userId: true } }, queue: true },
      });
      if (!appointment) return { kind: "not-found" };
      if (appointment.bookingType !== "EMERGENCY" || appointment.emergencyStatus !== "PENDING") {
        return { kind: "not-pending" };
      }
      if (req.user.role === "DOCTOR" && appointment.doctor.userId !== req.user.id) {
        return { kind: "forbidden" };
      }

      const nextEmergencyStatus = decision === "approve" ? "APPROVED" : "DECLINED";
      const changed = await tx.appointment.updateMany({
        where: { id, bookingType: "EMERGENCY", emergencyStatus: "PENDING" },
        data: {
          emergencyStatus: nextEmergencyStatus,
          emergencyReviewedAt: new Date(),
          emergencyReviewedById: req.user.id,
          ...(decision === "decline" ? { status: "CANCELLED" } : {}),
        },
      });
      if (changed.count !== 1) return { kind: "conflict" };

      if (appointment.queue) {
        await tx.queue.updateMany({
          where: { id: appointment.queue.id, status: "WAITING" },
          data: decision === "approve"
            ? { priority: "EMERGENCY" }
            : { status: "CANCELLED" },
        });
      }

      await tx.notification.create({
        data: {
          userId: appointment.patientId,
          type: "APPOINTMENT",
          message: decision === "approve"
            ? `Your emergency request ${appointment.queue?.tokenNumber || ""} was approved for priority assessment. The app does not guarantee immediate treatment and does not record payment.`
            : `Your emergency request ${appointment.queue?.tokenNumber || ""} was declined. Please contact hospital staff for next steps. If this is serious or life-threatening, seek immediate in-person emergency care.`,
        },
      });
      return { kind: "ok", status: nextEmergencyStatus, tokenNumber: appointment.queue?.tokenNumber };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (outcome.kind === "not-found") return res.status(404).json({ error: "Appointment not found" });
    if (outcome.kind === "not-pending") return res.status(409).json({ error: "This emergency request has already been reviewed or is not an emergency request" });
    if (outcome.kind === "forbidden") return res.status(403).json({ error: "You can only review emergency requests for your assigned patients" });
    if (outcome.kind === "conflict") return res.status(409).json({ error: "Another staff member already processed this request. Refresh the dashboard." });
    res.json({ success: true, emergencyStatus: outcome.status, tokenNumber: outcome.tokenNumber });
  } catch (error) {
    if (error.code === "P2034") return res.status(409).json({ error: "Concurrent review detected. Refresh and check the request status." });
    console.error("Emergency decision error:", error.message);
    res.status(500).json({ error: "Could not process emergency decision" });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON request body" });
  }
  console.error("Unhandled API error:", error.message);
  res.status(500).json({ error: "Unexpected server error" });
});

const server = app.listen(PORT, () => {
  console.log(`${HOSPITAL_NAME} API running at http://localhost:${PORT}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

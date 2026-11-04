
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../middleware/authMiddleware");
const prisma = require("../config/prisma");

const router = express.Router();

function createToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    { id: user.id, role: user.role },
    secret,
    { algorithm: "HS256", expiresIn: "2h" }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

router.post("/register", async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, error: "Authentication service is not configured." });
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;

    if (!name || !email || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        error: "Name, email and password are required.",
      });
    }

    if (name.length > 100 || email.length > 254) {
      return res.status(400).json({
        success: false,
        error: "Name or email is too long.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid email address.",
      });
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters and at most 72 bytes.",
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "PATIENT",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      user: publicUser(user),
      token: createToken(user),
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      error: "Could not register account.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, error: "Authentication service is not configured." });
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;
    const portal = body.portal;

    if (portal !== undefined && !["patient", "staff"].includes(portal)) {
      return res.status(400).json({ success: false, error: "Invalid login portal." });
    }

    if (!email || typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required.",
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    const isHashedPassword = user.password.startsWith("$2");
    let passwordMatches = false;

    if (isHashedPassword) {
      passwordMatches = await bcrypt.compare(password, user.password);
    } else {
      // Temporary compatibility for existing demo accounts.
      passwordMatches = password === user.password;
    }

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    // Keep the two portals distinct; the server derives the role from the stored account.
    if (portal === "patient" && user.role !== "PATIENT") {
      return res.status(403).json({ success: false, error: "This is a staff account. Please use Staff Login." });
    }
    if (portal === "staff" && !["DOCTOR", "ADMIN"].includes(user.role)) {
      return res.status(403).json({ success: false, error: "This account is not authorized for staff access." });
    }

    // Upgrade legacy plaintext passwords after a successful login.
    if (!isHashedPassword) {
      const hashedPassword = await bcrypt.hash(password, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
    }

    const token = createToken(user);

    return res.json({
      success: true,
      message: "Login successful.",
      user: publicUser(user),
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Could not log in.",
    });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Account no longer exists.",
      });
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.error("Profile error:", error);
    return res.status(500).json({
      success: false,
      error: "Could not load profile.",
    });
  }
});

module.exports = router;

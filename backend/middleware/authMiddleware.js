const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please log in.",
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not configured.");
    return res.status(500).json({
      success: false,
      error: "Authentication service is not configured.",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired authentication token.",
    });
  }

  if (!Number.isInteger(decoded.id) || !["PATIENT", "DOCTOR", "ADMIN"].includes(decoded.role)) {
    return res.status(401).json({
      success: false,
      error: "Invalid authentication token.",
    });
  }

  try {
    // Recheck persisted role on each protected request so role changes/revoked demo
    // staff accounts take effect immediately instead of waiting for JWT expiry.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true },
    });
    if (!user || user.role !== decoded.role) {
      return res.status(401).json({
        success: false,
        error: "Your account session is no longer valid. Please sign in again.",
      });
    }
    req.user = { id: user.id, role: user.role };
    return next();
  } catch (error) {
    console.error("Authentication account lookup failed:", error.message);
    return res.status(503).json({
      success: false,
      error: "Authentication service is temporarily unavailable.",
    });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to access this resource.",
      });
    }
    return next();
  };
}

module.exports = { authenticateToken, authorizeRoles };

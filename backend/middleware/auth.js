const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Refusing to start.');
}

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid token.' });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    // Recheck lock/status on every request so admin actions take effect immediately
    if (user.is_locked) {
      return res.status(401).json({ error: 'Your account has been locked. Please contact an administrator.' });
    }
    if (user.status === 'pending' || user.status === 'rejected') {
      return res.status(401).json({ error: 'Your account is no longer active.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed.' });
  }
};

const userAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'user') {
        return res.status(403).json({ error: 'Access denied. User privileges required.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed.' });
  }
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = {
  auth,
  adminAuth,
  userAuth,
  generateToken,
};

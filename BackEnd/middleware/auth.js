const jwt = require('jsonwebtoken');
require('dotenv').config();
const { User } = require('../models');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    // Invalidate older sessions after "sign out everywhere"
    if ((decoded.tv || 0) !== (user.tokenVersion || 0))
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });

    if (user.isSuspended)
      return res.status(403).json({ message: 'This account has been suspended. Contact support.' });

    req.user = user; // add user to request
    next();

  } catch (err) {
    return res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};

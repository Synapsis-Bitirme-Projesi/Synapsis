const jwt = require('jsonwebtoken');

// Attach req.user if a valid JWT is present in the Authorization header.
// Usage: add this middleware to any route that requires a logged-in user.
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email }
    next();
  } catch (err) {
    console.error("JWT Doğrulama Hatası:", err.message); // Hatanın nedenini terminale yazar
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = { protect };

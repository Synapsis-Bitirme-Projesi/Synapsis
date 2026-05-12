const jwt = require('jsonwebtoken');

// Attach req.user if a valid JWT is present in the Authorization header.
// Usage: add this middleware to any route that requires a logged-in user.
// middleware/authMiddleware.js
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // "Bearer token_burada" -> [Bearer, token_burada]
      token = req.headers.authorization.split(' ')[1];

      if (!token || token === "null") {
        return res.status(401).json({ error: "Token bulunamadı" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      console.error("JWT Hatası:", error.message);
      return res.status(401).json({ error: "Yetkisiz erişim: " + error.message });
    }
  } else {
    res.status(401).json({ error: "Token yok, yetki reddedildi" });
  }
};

module.exports = { protect };

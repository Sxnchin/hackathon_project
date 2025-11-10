import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  const header = req.headers.authorization;
  let token = null;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.headers.cookie) {
    // parse cookie header to find ls_token
    const cookies = req.headers.cookie.split(';').map(c => c.trim());
    const match = cookies.find(c => c.startsWith('ls_token='));
    if (match) token = match.split('=')[1];
  }

  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    console.error('Auth verify error', err);
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "2h" });
}
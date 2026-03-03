const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    const token = req.header("Authorization");

    if (!token) return res.status(401).json({ error: "Acceso denegado" });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch {
        res.status(400).json({ error: "Token no válido" });
    }
};

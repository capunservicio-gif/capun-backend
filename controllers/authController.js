const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password)
        return res.status(400).json({ msg: "Todos los campos son obligatorios" });

    try {
        const existe = await User.findOne({ email });
        if (existe) return res.status(400).json({ msg: "El email ya está registrado" });

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        const nuevoUsuario = new User({
            nombre,
            email,
            password: hashedPass
        });

        await nuevoUsuario.save();
        res.json({ msg: "Usuario registrado correctamente" });

    } catch (error) {
        res.status(500).json({ msg: "Error en el servidor" });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const usuario = await User.findOne({ email });
        if (!usuario) return res.status(400).json({ msg: "Credenciales inválidas" });

        const match = await bcrypt.compare(password, usuario.password);
        if (!match) return res.status(400).json({ msg: "Credenciales inválidas" });

        const token = jwt.sign(
            { id: usuario._id },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.json({ token, usuario: { nombre: usuario.nombre, email: usuario.email } });

    } catch (error) {
        res.status(500).json({ msg: "Error en el servidor" });
    }
};

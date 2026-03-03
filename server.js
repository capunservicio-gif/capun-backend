// ==========================================
// SERVIDOR COMPLETO CAPUN (server.js)
// ==========================================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Importar Modelos (Asegúrate de tenerlos en la carpeta models)
const User = require("./models/User");
const Child = require("./models/Child"); // Este reemplaza a Progress
const Message = require("./models/Message"); // Asegúrate de haber actualizado este modelo

const app = express();
app.use(express.json());
app.use(cors());

// Conectar MongoDB (Tu string de conexión original)
mongoose.connect("mongodb+srv://capun_user:dPezfWkAPwK1giCF@capun-db.izd7i1h.mongodb.net/?appName=capun-db")
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch(err => console.error("❌ Error de conexión:", err));

const SECRET_KEY = "secreto_super_seguro_capun";

// MIDDLEWARE DE VERIFICACIÓN
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ error: "Token requerido" });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Token inválido" });
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
};

// ==========================================
// 🔐 RUTAS DE AUTENTICACIÓN
// ==========================================

// REGISTRO
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, childName } = req.body;

    // 1. Verificar si ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "El correo ya está registrado" });

    // 2. Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Crear Usuario (Padre)
    const newUser = new User({
      email,
      password: hashedPassword,
      role: "parent", // Por defecto es padre
      name: req.body.nombre || "Usuario",
    });
    await newUser.save();

    // 4. Crear Expediente del Niño Automáticamente
    if (childName) {
      const newChild = new Child({
        parentId: newUser._id,
        name: childName,
        generalStatus: "En proceso",
        areas: {
          lenguaje: { percentage: 0, feedback: "Esperando evaluación" },
          motor: { percentage: 0, feedback: "Esperando evaluación" },
          social: { percentage: 0, feedback: "Esperando evaluación" },
          cognitivo: { percentage: 0, feedback: "Esperando evaluación" },
        },
      });
      await newChild.save();
    }

    res.json({ message: "Usuario registrado con éxito" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ error: "Contraseña incorrecta" });

    // Buscar nombre del niño si es padre
    let childName = "";
    if (user.role === "parent") {
      const child = await Child.findOne({ parentId: user._id });
      if (child) childName = child.name;
    }

    const token = jwt.sign({ id: user._id, role: user.role }, SECRET_KEY, {
      expiresIn: "24h",
    });

    res.json({
      token,
      role: user.role,
      name: user.name,
      childName: childName,
    });
  } catch (error) {
    res.status(500).json({ error: "Error en login" });
  }
});

// ==========================================
// 📊 RUTAS DEL DASHBOARD (PADRES)
// ==========================================

// DATOS DEL ALUMNO (Inteligente: Para Padre o para Maestro viendo alumno)
app.get("/api/my-child-data", verifyToken, async (req, res) => {
    try {
        let child = null;

        // CASO A: MAESTRO/ADMIN QUIERE VER UN ALUMNO ESPECÍFICO
        // (Viene el ID en la URL: ?studentId=...)
        if ((req.userRole === 'teacher' || req.userRole === 'admin') && req.query.studentId) {
            child = await Child.findById(req.query.studentId);
        } 
        // CASO B: PADRE ENTRANDO A SU DASHBOARD NORMAL
        else {
            child = await Child.findOne({ parentId: req.userId });
        }

        if (!child) return res.status(404).json({ message: "No se encontró información del alumno" });

        res.json(child);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos" });
    }
});

// EVENTOS GLOBALES (Para todos)
app.get("/api/events", verifyToken, async (req, res) => {
  try {
    // Aquí podrías crear un modelo Event, pero usaremos uno simple por ahora o simulado
    // Si creaste un modelo Event, úsalo aquí. Si no, devolvemos un array vacío o mock.
    // Asumiremos que tienes una colección 'events' o usaremos la colección Child para guardar eventos globales (opcional).
    // Para simplificar y que funcione con lo que tienes en teacher.html:
    // Vamos a crear una colección simple al vuelo o usar una variable global temporal si no tienes modelo.
    // MEJOR: Vamos a usar una colección 'Event' si existe, si no, devolvemos vacío.
    // Nota: Si no tienes modelo Event.js, crea uno rápido o esta ruta fallará.
    // Para que no falle, devolveremos vacío si no hay lógica de eventos implementada en BD aún.
    
    // *Si implementaste el modelo Event, descomenta esto:*
    const Event = require("./models/Event"); 
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
    
  } catch (error) {
    // Si no existe el modelo, devolvemos vacío para no romper nada
    res.json([]); 
  }
});

// CREAR EVENTO (Para Maestro)
app.post("/api/events", verifyToken, async (req, res) => {
    try {
        const Event = require("./models/Event");
        const { title, date, description } = req.body;
        const newEvent = new Event({ title, date, description });
        await newEvent.save();
        res.json({ message: "Evento creado" });
    } catch (error) {
        res.status(500).json({ error: "Error al crear evento" });
    }
});


// ==========================================
// 🍎 RUTAS DE MAESTROS
// ==========================================

// OBTENER TODOS LOS ALUMNOS
app.get("/api/teacher/students", verifyToken, async (req, res) => {
    try {
        const students = await Child.find();
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener alumnos" });
    }
});

/// ACTUALIZAR BOLETA DEL ALUMNO (Por Mes)
app.put("/api/teacher/students/:id/boleta", verifyToken, async (req, res) => {
    try {
        if(req.userRole !== 'teacher' && req.userRole !== 'admin') return res.status(403).json({ error: "Acceso denegado" });

        const { month, grades, attendanceStats, generalStatus } = req.body;
        const studentId = req.params.id;

        const student = await Child.findById(studentId);
        if (!student) return res.status(404).json({ error: "Alumno no encontrado" });

        // 1. Actualizar estatus general
        if(generalStatus) student.generalStatus = generalStatus;

        // 2. Actualizar Calificaciones del Mes
        if (!student.boleta) student.boleta = { grades: {}, attendanceStats: {} };
        if (!student.boleta.grades) student.boleta.grades = {};
        if (!student.boleta.attendanceStats) student.boleta.attendanceStats = {};

        // Guardamos los datos bajo la llave del mes (ej: "sept")
        student.boleta.grades[month] = grades; 
        student.boleta.attendanceStats[month] = attendanceStats;

        // Marcamos a Mongoose que hubo cambios en un objeto mixto
        student.markModified('boleta');

        await student.save();
        res.json({ message: "Boleta actualizada correctamente", student });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al guardar boleta" });
    }
});

// REGISTRAR ASISTENCIA
app.post("/api/teacher/students/:id/attendance", verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        const student = await Child.findById(req.params.id);
        student.attendance.push({ status, date: new Date() });
        await student.save();
        res.json({ message: "Asistencia registrada" });
    } catch (error) {
        res.status(500).json({ error: "Error" });
    }
});

// AGREGAR LOGRO
app.post("/api/teacher/students/:id/achievement", verifyToken, async (req, res) => {
    try {
        const { title } = req.body;
        const student = await Child.findById(req.params.id);
        student.achievements.push({ title, date: new Date() });
        await student.save();
        res.json({ message: "Logro agregado" });
    } catch (error) {
        res.status(500).json({ error: "Error" });
    }
});

// ==========================================
// 📬 RUTAS DE MENSAJERÍA (Buzón Completo)
// ==========================================

// 1. OBTENER MENSAJES (Para el PADRE)
app.get("/api/messages", verifyToken, async (req, res) => {
    try {
        // El padre ve: Mensajes que envió (from: él) O mensajes dirigidos a él (toUser: él)
        const messages = await Message.find({
            $or: [
                { from: req.userId },
                { toUser: req.userId }
            ]
        })
        .populate('from', 'name role')
        .sort({ date: 1 }); // Cronológico
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Error al cargar mensajes" });
    }
});

// 2. ENVIAR MENSAJE (Padre o Maestro)
app.post("/api/messages", verifyToken, async (req, res) => {
    try {
        const { content, toRole, toUser } = req.body;
        
        const newMessage = new Message({
            from: req.userId,
            content,
            toRole, 
            toUser
        });
        
        await newMessage.save();
        res.json({ message: "Mensaje enviado" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al enviar" });
    }
});

// 3. OBTENER BUZÓN MAESTRO (Enviados y Recibidos)
app.get("/api/teacher/messages", verifyToken, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { toRole: { $in: ['teacher', 'admin'] } }, // Lo que reciben los profes
                { from: req.userId } // Lo que responde ESTE profe
            ]
        })
        .populate('from', 'name email') 
        .populate('toUser', 'name') // Para ver a quién le contestó
        .sort({ date: -1 }); // Más recientes primero

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Error al leer buzón" });
    }
});

// ==========================================
// 🗑️ RUTAS DE ELIMINACIÓN (NUEVAS)
// ==========================================

// ELIMINAR ASISTENCIA
app.delete("/api/teacher/students/:id/attendance/:itemId", verifyToken, async (req, res) => {
    try {
        await Child.updateOne(
            { _id: req.params.id },
            { $pull: { attendance: { _id: req.params.itemId } } }
        );
        res.json({ message: "Asistencia eliminada" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar" });
    }
});

// ELIMINAR LOGRO
app.delete("/api/teacher/students/:id/achievement/:itemId", verifyToken, async (req, res) => {
    try {
        await Child.updateOne(
            { _id: req.params.id },
            { $pull: { achievements: { _id: req.params.itemId } } }
        );
        res.json({ message: "Logro eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar" });
    }
});

// ELIMINAR EVENTO (AVISO)
app.delete("/api/events/:id", verifyToken, async (req, res) => {
    try {
        // Usamos el modelo Event (asegúrate de que exista o usa una colección genérica)
        // Si no tienes modelo Event.js, usa: mongoose.connection.db.collection('events').deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
        const Event = require("./models/Event");
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: "Evento eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar evento" });
    }
});

// ==========================================
// 🛡️ RUTAS DE ADMINISTRADOR (Gestión de Cuentas)
// ==========================================

// 1. OBTENER TODOS LOS USUARIOS (Sin mostrar contraseñas)
app.get("/api/admin/users", verifyToken, async (req, res) => {
    try {
        // Solo Admin puede ver esto
        if(req.userRole !== 'admin') return res.status(403).json({ error: "Acceso denegado" });

        const users = await User.find({}, '-password'); // El guion -password significa "no me traigas la contraseña"
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
});

// 2. RESTABLECER CONTRASEÑA DE UN USUARIO
app.put("/api/admin/users/:id/reset-password", verifyToken, async (req, res) => {
    try {
        if(req.userRole !== 'admin') return res.status(403).json({ error: "Acceso denegado" });

        const { newPassword } = req.body;
        if(!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
        }

        // Encriptar la nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
        
        res.json({ message: "Contraseña actualizada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al cambiar contraseña" });
    }
});


// 3. CREAR USUARIO (Corrección para evitar 'undefined')
app.post("/api/admin/users", verifyToken, async (req, res) => {
    try {
        if(req.userRole !== 'admin') return res.status(403).json({ error: "Acceso denegado" });

        const { name, email, password, role, childName } = req.body;

        if (!name || !email || !password) return res.status(400).json({ error: "Faltan datos" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name, // Aseguramos que se guarde el nombre
            email,
            password: hashedPassword,
            role
        });
        await newUser.save();

        if (role === 'parent' && childName) {
            const Child = require("./models/Child");
            const newChild = new Child({
                parentId: newUser._id,
                name: childName,
                generalStatus: "En proceso",
                areas: {
                    lenguaje: { percentage: 10, feedback: "Iniciando" },
                    motor: { percentage: 10, feedback: "Iniciando" },
                    social: { percentage: 10, feedback: "Iniciando" },
                    cognitivo: { percentage: 10, feedback: "Iniciando" }
                }
            });
            await newChild.save();
        }

        res.json({ message: "Usuario creado" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear" });
    }
});

// 4. ELIMINAR USUARIO (Maestro o Padre)
app.delete("/api/admin/users/:id", verifyToken, async (req, res) => {
    try {
        if(req.userRole !== 'admin') return res.status(403).json({ error: "Acceso denegado" });

        const userId = req.params.id;
        
        // 1. Borrar el Usuario (Cuenta de acceso)
        await User.findByIdAndDelete(userId);

        // 2. Si era un Padre, borrar también su Alumno (Expediente)
        // Buscamos si hay un niño ligado a este papá y lo borramos
        const Child = require("./models/Child"); // Asegúrate de importar el modelo
        await Child.findOneAndDelete({ parentId: userId });

        res.json({ message: "Usuario y datos eliminados correctamente" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar usuario" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor CAPUN corriendo en http://localhost:${PORT}`));
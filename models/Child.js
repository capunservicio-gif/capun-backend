const mongoose = require("mongoose");

const ChildSchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: { type: String, required: true },
  generalStatus: { type: String, default: "En proceso" },

  // --- NUEVA ESTRUCTURA BASADA EN EL PDF ---
  boleta: {
    // Guardamos las calificaciones por mes (ago, sept, oct...)
    // Ejemplo: { "sept": { "Matemáticas": "E", "Arte": "MB" } }
    grades: { type: Object, default: {} },
    
    // Guardamos las estadísticas de asistencia por mes
    // Ejemplo: { "sept": { "retardos": 3, "faltas": 0 } }
    attendanceStats: { type: Object, default: {} }
  },

  // Mantenemos el historial diario por si lo usan para pasar lista rápida
  attendanceLog: [
    {
      date: { type: Date, default: Date.now },
      status: { type: String, enum: ["Asistió", "Falta", "Retardo"] },
    },
  ],
  
  // Logros y notas siguen igual
  achievements: [
    {
      title: String,
      date: { type: Date, default: Date.now },
    },
  ]
});

module.exports = mongoose.model("Child", ChildSchema);
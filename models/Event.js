const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } // Solo Admin/Maestro crea
});

module.exports = mongoose.model('Event', EventSchema);
const express = require("express");
const router = express.Router();
const Child = require("../models/child");
const auth = require("../middleware/auth");

// Registrar hijo
router.post("/add", auth, async (req, res) => {
  try {
    const { childName, age, diagnosis } = req.body;

    const newChild = new Child({
      parentId: req.user.id,
      childName,
      age,
      diagnosis
    });

    await newChild.save();
    res.json({ message: "Hijo registrado correctamente", child: newChild });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al registrar hijo" });
  }
});

// Obtener hijos del padre
router.get("/", auth, async (req, res) => {
  try {
    const children = await Child.find({ parentId: req.user.id });
    res.json(children);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener hijos" });
  }
});

module.exports = router;

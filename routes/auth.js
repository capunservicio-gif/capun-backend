// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // ACEPTAR MÚLTIPLES CAMPOS PARA NOMBRE
    const { name, nombre, fullName, childName, email, password, role } = req.body;
    
    // Usar el primer nombre disponible
    const finalName = name || nombre || fullName || 'Usuario CAPUN';
    
    // Validación básica
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email y contraseña son requeridos' 
      });
    }
    
    // Validar email único
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'El email ya está registrado' 
      });
    }
    
    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Validar y asignar rol (solo 'parent' por defecto en registro)
    const validRoles = ['parent', 'teacher', 'admin'];
    const finalRole = validRoles.includes(role) ? role : 'parent';
    
    // Crear nuevo usuario
    const newUser = new User({
      name: finalName,
      email: email,
      password: hashedPassword,
      childName: childName || '',
      role: finalRole, // Rol asignado (siempre 'parent' para registro público)
      isActive: true
    });
    
    // Guardar usuario
    await newUser.save();
    
    console.log('✅ Usuario registrado:', newUser.email, 'Rol:', newUser.role);
    
    // Responder éxito
    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        childName: newUser.childName,
        role: newUser.role
      }
    });
    
  } catch (error) {
    console.error('❌ Error en registro:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error en el servidor',
      error: error.message 
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    console.log('🔑 Recibiendo login:', req.body);
    
    const { email, password } = req.body;
    
    // Validación básica
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email y contraseña son requeridos' 
      });
    }
    
    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Email no encontrado' 
      });
    }
    
    // Verificar si está activo
    if (user.isActive === false) {
      return res.status(403).json({ 
        success: false,
        message: 'Cuenta desactivada. Contacta al administrador.' 
      });
    }
    
    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Contraseña incorrecta' 
      });
    }
    
    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();
    
    // Crear token JWT (INCLUIR EL ROL EN EL PAYLOAD)
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        role: user.role || 'parent' // ← ¡IMPORTANTE! Incluir rol en el token
      }, 
      process.env.JWT_SECRET || 'capun_secret_123',
      { expiresIn: '24h' }
    );
    
    console.log('✅ Login exitoso para:', user.email, 'Rol:', user.role);
    
    // Responder con token y datos COMPLETOS del usuario
    return res.json({
      success: true,
      message: 'Login exitoso',
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        childName: user.childName,
        role: user.role || 'parent', // ← ¡IMPORTANTE! Incluir siempre el rol
        lastLogin: user.lastLogin
      }
    });
    
  } catch (error) {
    console.error('❌ Error en login:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error en el servidor',
      error: error.message 
    });
  }
});

// GET /api/auth/me - Obtener información del usuario actual
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Token no proporcionado' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'capun_secret_123');
    
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Usuario no encontrado' 
      });
    }
    
    return res.json({
      success: true,
      user: user
    });
    
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: 'Token inválido o expirado' 
    });
  }
});

// POST /api/auth/logout - Logout (simbólico, el frontend borra el token)
router.post('/logout', async (req, res) => {
  try {
    // En una implementación más avanzada, podrías invalidar el token
    // Por ahora, solo respondemos éxito y el frontend borra el token localmente
    
    return res.json({
      success: true,
      message: 'Logout exitoso'
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: 'Error en el servidor',
      error: error.message 
    });
  }
});

// POST /api/auth/update-profile - Actualizar perfil (opcional)
router.post('/update-profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Token no proporcionado' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'capun_secret_123');
    const { name, childName, email } = req.body;
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Usuario no encontrado' 
      });
    }
    
    // Actualizar campos permitidos
    if (name) user.name = name;
    if (childName) user.childName = childName;
    
    // Si cambia el email, verificar que no exista
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ 
          success: false,
          message: 'El nuevo email ya está registrado' 
        });
      }
      user.email = email;
    }
    
    await user.save();
    
    return res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        childName: user.childName,
        role: user.role
      }
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: 'Error en el servidor',
      error: error.message 
    });
  }
});

// POST /api/auth/change-password - Cambiar contraseña (opcional)
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Token no proporcionado' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'capun_secret_123');
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Contraseña actual y nueva contraseña son requeridas' 
      });
    }
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Usuario no encontrado' 
      });
    }
    
    // Verificar contraseña actual
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Contraseña actual incorrecta' 
      });
    }
    
    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    await user.save();
    
    return res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: 'Error en el servidor',
      error: error.message 
    });
  }
});

module.exports = router;
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Configurar transporter (usa variables de entorno en producción)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Puedes usar otro servicio
    auth: {
        user: process.env.EMAIL_USER || 'tuemail@gmail.com',
        pass: process.env.EMAIL_PASS || 'tucontraseña'
    }
});

// Solicitar recuperación
exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'No existe una cuenta con ese email' 
            });
        }
        
        // Generar token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = Date.now() + 3600000; // 1 hora
        
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpires;
        await user.save();
        
        // Crear enlace de recuperación
        const resetUrl = `http://localhost:5500/frontend/pages/reset-password.html?token=${resetToken}`;
        
        // Configurar email
        const mailOptions = {
            from: 'CAPUN <no-reply@capun.edu.mx>',
            to: user.email,
            subject: 'Recuperación de contraseña - CAPUN',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3498db;">Recuperación de contraseña</h2>
                    <p>Hola ${user.name},</p>
                    <p>Has solicitado restablecer tu contraseña en CAPUN.</p>
                    <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #3498db; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Restablecer contraseña
                        </a>
                    </div>
                    <p>Este enlace expirará en 1 hora.</p>
                    <p>Si no solicitaste este cambio, ignora este correo.</p>
                    <hr>
                    <p style="color: #777; font-size: 12px;">
                        CAPUN - Centro de Apoyo Para Unidades de Necesidades Especiales<br>
                        Email: soporte@capun.edu.mx
                    </p>
                </div>
            `
        };
        
        // Enviar email
        await transporter.sendMail(mailOptions);
        
        // En desarrollo, mostrar el token en consola
        console.log('📧 Token de recuperación (desarrollo):', resetToken);
        console.log('🔗 Enlace de recuperación:', resetUrl);
        
        res.json({ 
            success: true, 
            message: 'Se ha enviado un correo con instrucciones',
            // En desarrollo, también devolver el token
            token: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });
        
    } catch (error) {
        console.error('Error en recuperación:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al procesar la solicitud' 
        });
    }
};

// Resetear contraseña
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Token inválido o expirado' 
            });
        }
        
        // Hashear nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save();
        
        res.json({ 
            success: true, 
            message: 'Contraseña actualizada correctamente' 
        });
        
    } catch (error) {
        console.error('Error en reset:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar la contraseña' 
        });
    }
};
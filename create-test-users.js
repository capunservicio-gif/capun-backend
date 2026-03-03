const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function createTestUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB\n');
        
        // Crear usuarios de prueba
        const testUsers = [
            {
                name: 'Padre de Prueba',
                email: 'padre@capun.edu.mx',
                password: '123456',
                role: 'parent',
                childName: 'Juan Pérez',
                childAge: 8,
                diagnosis: 'TEA'
            },
            {
                name: 'Maestro de Prueba',
                email: 'maestro@capun.edu.mx',
                password: '123456',
                role: 'teacher'
            },
            {
                name: 'Administrador',
                email: 'admin@capun.edu.mx',
                password: '123456',
                role: 'admin'
            },
            {
                name: 'Ana García',
                email: 'ana@capun.edu.mx',
                password: '123456',
                role: 'parent',
                childName: 'Carlos García',
                childAge: 10,
                diagnosis: 'Síndrome de Down'
            }
        ];
        
        for (const userData of testUsers) {
            // Verificar si el usuario ya existe
            const existingUser = await User.findOne({ email: userData.email });
            
            if (!existingUser) {
                // Hashear contraseña
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                
                // Crear usuario
                const user = new User({
                    name: userData.name,
                    email: userData.email,
                    password: hashedPassword,
                    role: userData.role,
                    childName: userData.childName || '',
                    childAge: userData.childAge || null,
                    diagnosis: userData.diagnosis || '',
                    isActive: true
                });
                
                await user.save();
                console.log(`✅ Usuario creado: ${userData.email} (${userData.role})`);
            } else {
                console.log(`⚠️ Usuario ya existe: ${userData.email}`);
                
                // Actualizar rol si es necesario
                if (existingUser.role !== userData.role) {
                    existingUser.role = userData.role;
                    existingUser.childName = userData.childName || existingUser.childName;
                    existingUser.childAge = userData.childAge || existingUser.childAge;
                    existingUser.diagnosis = userData.diagnosis || existingUser.diagnosis;
                    await existingUser.save();
                    console.log(`   Rol actualizado a: ${userData.role}`);
                }
            }
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Usuarios de prueba creados/actualizados');
        console.log('\n📋 Credenciales:');
        console.log('1. Padre: padre@capun.edu.mx / 123456');
        console.log('2. Maestro: maestro@capun.edu.mx / 123456');
        console.log('3. Administrador: admin@capun.edu.mx / 123456');
        console.log('4. Padre 2: ana@capun.edu.mx / 123456');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

createTestUsers();
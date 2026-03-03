// backend/check-db.js
const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB\n');
        
        // Listar colecciones
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📁 Colecciones disponibles:');
        collections.forEach(collection => console.log(`  - ${collection.name}`));
        
        // Ver usuarios
        const User = require('./models/User');
        const users = await User.find().select('-password');
        console.log('\n👥 Usuarios registrados:', users.length);
        users.forEach(user => {
            console.log(`  - ${user.name} (${user.email}) - ${user.role || 'parent'}`);
        });
        
        // Ver hijos
        const Child = require('./models/child');
        const children = await Child.find().populate('parentId', 'name email');
        console.log('\n👶 Hijos/Alumnos registrados:', children.length);
        children.forEach(child => {
            console.log(`  - ${child.childName} (${child.age} años) - ${child.diagnosis || 'Sin diagnóstico'}`);
        });
        
        await mongoose.disconnect();
        console.log('\n✅ Verificación completada');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkDatabase();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Child = require('./models/child');

async function fixAndSeed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🌱 Arreglando y sembrando datos...\n');

        // ============================================
        // 1. ARREGLAR EL USUARIO MAESTRO
        // ============================================
        console.log('🔧 Buscando usuario maestro...');
        
        let teacher = await User.findOne({ email: 'maestro@capun.edu.mx' });
        
        if (!teacher) {
            console.log('❌ Usuario maestro no encontrado. Creando...');
            
            const hashedPassword = await bcrypt.hash('123456', 10);
            teacher = new User({
                name: 'Maestro CAPUN',
                email: 'maestro@capun.edu.mx',
                password: hashedPassword,
                role: 'teacher',  // ¡ROL CORRECTO!
                isActive: true
            });
            await teacher.save();
            console.log('✅ Maestro creado');
        } else {
            console.log('✅ Usuario maestro encontrado');
            
            // FORZAR el rol a "teacher" sin importar lo que tenga
            teacher.role = 'teacher';
            teacher.isActive = true;
            await teacher.save();
            console.log('✅ Rol actualizado a "teacher" (forzado)');
        }
        
        console.log('\n📋 Datos del maestro arreglado:');
        console.log('- Email:', teacher.email);
        console.log('- Rol:', teacher.role);
        console.log('- Nombre:', teacher.name);
        console.log('- ID:', teacher._id);

        // ============================================
        // 2. CREAR PADRES DE PRUEBA SI NO EXISTEN
        // ============================================
        console.log('\n👥 Creando padres de prueba...');
        
        const parents = [
            {
                name: 'Juan Pérez',
                email: 'juan@ejemplo.com',
                password: '123456',
                role: 'parent',
                childName: 'Ana Pérez'
            },
            {
                name: 'María García',
                email: 'maria@ejemplo.com',
                password: '123456',
                role: 'parent',
                childName: 'Carlos García'
            },
            {
                name: 'Roberto López',
                email: 'roberto@ejemplo.com',
                password: '123456',
                role: 'parent',
                childName: 'Sofía López'
            }
        ];
        
        const parentUsers = [];
        
        for (const parentData of parents) {
            let parent = await User.findOne({ email: parentData.email });
            
            if (!parent) {
                const hashedPassword = await bcrypt.hash(parentData.password, 10);
                parent = new User({
                    name: parentData.name,
                    email: parentData.email,
                    password: hashedPassword,
                    role: 'parent',
                    childName: parentData.childName,
                    isActive: true
                });
                await parent.save();
                console.log(`✅ Padre creado: ${parentData.email}`);
            } else {
                console.log(`⚠️ Padre ya existe: ${parentData.email}`);
            }
            
            parentUsers.push(parent);
        }

        // ============================================
        // 3. CREAR NIÑOS/ALUMNOS DE PRUEBA
        // ============================================
        console.log('\n👶 Creando niños/alumnos de prueba...');
        
        const childrenData = [
            {
                childName: 'Ana Pérez',
                age: 8,
                diagnosis: 'Trastorno del Espectro Autista (TEA)',
                school: 'Escuela Primaria "Benito Juárez"',
                parentId: parentUsers[0]?._id
            },
            {
                childName: 'Carlos García',
                age: 10,
                diagnosis: 'Síndrome de Down',
                school: 'Centro de Atención Múltiple #15',
                parentId: parentUsers[1]?._id
            },
            {
                childName: 'Sofía López',
                age: 7,
                diagnosis: 'Discapacidad Intelectual',
                school: 'Escuela de Educación Especial "Luz del Saber"',
                parentId: parentUsers[2]?._id
            },
            {
                childName: 'Miguel Rodríguez',
                age: 9,
                diagnosis: 'Parálisis Cerebral',
                school: 'Unidad de Servicios de Apoyo a la Educación Regular',
                parentId: parentUsers[0]?._id  // Mismo padre que Ana
            },
            {
                childName: 'Laura Martínez',
                age: 6,
                diagnosis: 'TDAH',
                school: 'Jardín de Niños "María Montessori"',
                parentId: parentUsers[1]?._id  // Mismo padre que Carlos
            }
        ];
        
        for (const childData of childrenData) {
            // Verificar si ya existe
            const existingChild = await Child.findOne({
                childName: childData.childName,
                parentId: childData.parentId
            });
            
            if (!existingChild && childData.parentId) {
                const child = new Child({
                    parentId: childData.parentId,
                    childName: childData.childName,
                    age: childData.age,
                    diagnosis: childData.diagnosis,
                    progress: []  // Inicializar array de progreso vacío
                });
                
                await child.save();
                console.log(`✅ Niño creado: ${childData.childName} (${childData.age} años)`);
            } else if (!childData.parentId) {
                console.log(`⚠️ No se pudo crear ${childData.childName}: padre no encontrado`);
            } else {
                console.log(`⚠️ Niño ya existe: ${childData.childName}`);
            }
        }

        // ============================================
        // 4. VERIFICAR Y MOSTRAR RESULTADOS
        // ============================================
        console.log('\n📊 VERIFICACIÓN FINAL:');
        
        // Verificar maestro
        const verifiedTeacher = await User.findOne({ email: 'maestro@capun.edu.mx' });
        console.log('\n✅ MAESTRO:');
        console.log(`- Email: ${verifiedTeacher.email}`);
        console.log(`- Rol: ${verifiedTeacher.role}`);
        console.log(`- Nombre: ${verifiedTeacher.name}`);
        
        // Contar niños
        const totalChildren = await Child.countDocuments();
        console.log(`\n👶 TOTAL NIÑOS REGISTRADOS: ${totalChildren}`);
        
        // Mostrar lista de niños
        const allChildren = await Child.find().populate('parentId', 'name email');
        console.log('\n📋 LISTA DE NIÑOS/ALUMNOS:');
        allChildren.forEach((child, index) => {
            console.log(`${index + 1}. ${child.childName} (${child.age} años)`);
            console.log(`   Diagnóstico: ${child.diagnosis}`);
            console.log(`   Padre: ${child.parentId?.name || 'No asignado'}`);
            console.log(`   ID: ${child._id}`);
            console.log('');
        });
        
        await mongoose.disconnect();
        
        console.log('🎉 ¡PROCESO COMPLETADO EXITOSAMENTE!');
        console.log('\n🔑 CREDENCIALES ACTUALIZADAS:');
        console.log('1. Maestro: maestro@capun.edu.mx / 123456 → ROL: teacher');
        console.log('2. Admin: admin@capun.edu.mx / 123456 → ROL: admin');
        console.log('3. Padres: juan@ejemplo.com / 123456, maria@ejemplo.com / 123456, etc.');
        console.log('\n📍 Ahora deberías ver los niños en el panel del maestro.');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Ejecutar
fixAndSeed();
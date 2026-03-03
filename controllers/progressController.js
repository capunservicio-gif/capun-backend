const Progress = require('../models/Progress');
const Child = require('../models/child');
const User = require('../models/User');

// Crear nuevo progreso (para maestros)
exports.createProgress = async (req, res) => {
    try {
        const { childId, area, activity, score, observations, evidence } = req.body;
        const teacherId = req.user.id;
        
        // Verificar que el usuario sea maestro
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Solo maestros pueden registrar progresos' 
            });
        }
        
        // Verificar que el niño exista
        const child = await Child.findById(childId);
        if (!child) {
            return res.status(404).json({ 
                success: false, 
                message: 'Niño no encontrado' 
            });
        }
        
        // Crear progreso
        const newProgress = new Progress({
            child: childId,
            area,
            activity,
            score: parseInt(score),
            observations,
            evidence: evidence || [],
            teacher: teacherId,
            date: new Date()
        });
        
        await newProgress.save();
        
        res.status(201).json({
            success: true,
            message: 'Progreso registrado exitosamente',
            progress: newProgress
        });
        
    } catch (error) {
        console.error('Error al crear progreso:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al registrar progreso' 
        });
    }
};

// Obtener progresos de un niño (padres y maestros)
exports.getChildProgress = async (req, res) => {
    try {
        const { childId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        // Verificar permisos
        const child = await Child.findById(childId);
        if (!child) {
            return res.status(404).json({ 
                success: false, 
                message: 'Niño no encontrado' 
            });
        }
        
        // Verificar si es padre del niño o maestro/admin
        const isParent = child.parentId.toString() === userId;
        const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin';
        
        if (!isParent && !isTeacherOrAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permiso para ver estos progresos' 
            });
        }
        
        // Obtener progresos
        const progressList = await Progress.find({ child: childId })
            .populate('teacher', 'name email')
            .sort({ date: -1 });
        
        res.json({
            success: true,
            progress: progressList
        });
        
    } catch (error) {
        console.error('Error al obtener progresos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener progresos' 
        });
    }
};

// Obtener todos los niños (para maestros)
exports.getAllChildren = async (req, res) => {
    try {
        // Solo maestros y admins
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Acceso denegado' 
            });
        }
        
        const children = await Child.find()
            .populate('parentId', 'name email')
            .sort({ childName: 1 });
        
        res.json({
            success: true,
            children: children
        });
        
    } catch (error) {
        console.error('Error al obtener niños:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener lista de niños' 
        });
    }
};

// Estadísticas para dashboard
exports.getStatistics = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        let statistics = {};
        
        if (userRole === 'parent') {
            // Estadísticas para padres
            const children = await Child.find({ parentId: userId });
            const childrenIds = children.map(child => child._id);
            
            const totalProgress = await Progress.countDocuments({ 
                child: { $in: childrenIds } 
            });
            
            const recentProgress = await Progress.countDocuments({
                child: { $in: childrenIds },
                date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Últimos 30 días
            });
            
            statistics = {
                totalChildren: children.length,
                totalProgress,
                recentProgress,
                children: children.map(child => ({
                    id: child._id,
                    name: child.childName,
                    age: child.age,
                    diagnosis: child.diagnosis
                }))
            };
            
        } else if (userRole === 'teacher' || userRole === 'admin') {
            // Estadísticas para maestros/admins
            const totalChildren = await Child.countDocuments();
            const totalParents = await User.countDocuments({ role: 'parent' });
            const totalProgress = await Progress.countDocuments();
            
            const progressByArea = await Progress.aggregate([
                { $group: { _id: "$area", count: { $sum: 1 } } }
            ]);
            
            statistics = {
                totalChildren,
                totalParents,
                totalProgress,
                progressByArea,
                recentProgress: await Progress.countDocuments({
                    date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Últimos 7 días
                })
            };
        }
        
        res.json({
            success: true,
            statistics
        });
        
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener estadísticas' 
        });
    }
};
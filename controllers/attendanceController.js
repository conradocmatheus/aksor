const { db } = require('../config/firebase');

exports.getHomePage = (req, res) => {
    res.render('index');
};

exports.getCheckinPage = async (req, res) => {
    try {
        const { token } = req.params;
        const sessionDoc = await db.collection('sessions').doc(token).get();

        if (!sessionDoc.exists || new Date() > sessionDoc.data().expiresAt.toDate()) {
            return res.render('check-in', { token: null, swal: { icon: 'error', title: 'Sessão Inválida', text: 'Este link de chamada é inválido ou a sessão já expirou.' } });
        }
        res.render('check-in', { token, swal: null });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.registerAttendance = async (req, res) => {
    const { token, studentId } = req.body;
    const studentIp = req.ip;

    try {
        const sessionDoc = await db.collection('sessions').doc(token).get();
        if (!sessionDoc.exists || new Date() > sessionDoc.data().expiresAt.toDate()) {
            return res.render('check-in', { token, swal: { icon: 'error', title: 'Sessão Expirada', text: 'Esta sessão de chamada é inválida ou já expirou.' } });
        }
        
        const session = sessionDoc.data();
        const eventDoc = await db.collection('events').doc(session.eventId).get();
        const event = eventDoc.data();

        const studentQuery = await db.collection('students').where('eventId', '==', session.eventId).where('studentId', '==', studentId).limit(1).get();
        if (studentQuery.empty) {
            return res.render('check-in', { token, swal: { icon: 'error', title: 'Não Encontrado', text: 'O ID de Aluno informado não foi encontrado neste evento.' } });
        }
        const student = studentQuery.docs[0].data();

        if (!event.allowMultipleIPs) {
            const ipQuery = await db.collection('attendanceRecords').where('sessionId', '==', token).where('studentIp', '==', studentIp).limit(1).get();
            if (!ipQuery.empty) {
                return res.render('check-in', { token, swal: { icon: 'warning', title: 'Atenção', text: 'Este dispositivo já foi usado para registrar uma presença nesta sessão.' } });
            }
        }
        
        const alreadyRegisteredQuery = await db.collection('attendanceRecords').where('sessionId', '==', token).where('studentId', '==', studentId).limit(1).get();
        if (!alreadyRegisteredQuery.empty) {
            return res.render('check-in', { token, swal: { icon: 'info', title: 'Já Registrado', text: 'A presença para este ID de Aluno já foi registrada nesta sessão.' } });
        }

        await db.collection('attendanceRecords').add({
            sessionId: token,
            studentId: student.studentId,
            studentName: student.fullName,
            eventId: session.eventId,
            studentIp,
            recordedAt: new Date(),
        });

        const successSwal = {
            icon: 'success',
            title: 'Presença Confirmada!',
            text: `Olá, ${student.fullName}. Sua presença no evento "${event.eventName}" foi registrada.`,
            disableForm: true
        };
        res.render('check-in', { token, swal: successSwal });
    } catch (error) {
        console.error("Error registering attendance:", error);
        res.render('check-in', { token, swal: { icon: 'error', title: 'Erro Inesperado', text: 'Ocorreu um erro no servidor. Tente novamente.' } });
    }
};
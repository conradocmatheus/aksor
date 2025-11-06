const { db } = require('../config/firebase');
const { admin } = require('../config/firebase');
const fs = require('fs');
const csv = require('csv-parser');
const qrcode = require('qrcode');

exports.createEvent = async (req, res) => {
    try {
        const { eventName } = req.body;
        const teacherId = req.user.uid;

        const eventRef = await db.collection('events').add({
            eventName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expirationInSeconds: 300,
            allowMultipleIPs: false,
            teacherId: teacherId 
        });
        res.redirect(`/event/${eventRef.id}`);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.getManagementPage = async (req, res) => {
    try {
        const { eventId } = req.params;
        const eventDoc = await db.collection('events').doc(eventId).get();

        if (!eventDoc.exists || eventDoc.data().teacherId !== req.user.uid) {
            return res.status(403).send('Acesso Negado. Este evento não pertence a você ou não existe.');
        }

        const studentsSnapshot = await db.collection('students').where('eventId', '==', eventId).get();
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sessionsSnapshot = await db.collection('sessions').where('eventId', '==', eventId).orderBy('generatedAt', 'desc').get();
        const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.render('event-management', { event: { id: eventDoc.id, ...eventDoc.data() }, students, sessions, sessionData: null, req });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { expirationInSeconds, allowMultipleIPs } = req.body;
        await db.collection('events').doc(eventId).update({
            expirationInSeconds: parseInt(expirationInSeconds, 10),
            allowMultipleIPs: !!allowMultipleIPs,
        });
        res.redirect(`/event/${eventId}`);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.uploadStudents = (req, res) => {
    const { eventId } = req.params;
    const filePath = req.file.path;

    const oldStudentsQuery = db.collection('students').where('eventId', '==', eventId);
    oldStudentsQuery.get().then(snapshot => {
        if (snapshot.empty) return;
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        return batch.commit();
    }).then(() => {
        const newStudents = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                if (row.RA && row.Nome) {
                    newStudents.push({
                        studentId: row.RA.trim(),
                        fullName: row.Nome.trim(),
                        eventId: eventId,
                    });
                }
            })
            .on('end', async () => {
                const batch = db.batch();
                newStudents.forEach(student => {
                    const docRef = db.collection('students').doc();
                    batch.set(docRef, student);
                });
                await batch.commit();
                fs.unlinkSync(filePath);
                res.redirect(`/event/${eventId}`);
            });
    }).catch(error => {
        res.status(500).send(error.message);
    });
};

exports.startSession = async (req, res) => {
    try {
        const { eventId } = req.params;
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) return res.status(404).send('Event not found');
        
        const eventData = eventDoc.data();
        const sessionRef = db.collection('sessions').doc();
        const token = sessionRef.id;
        const generatedAt = new Date();
        const expiresAt = new Date(generatedAt.getTime() + eventData.expirationInSeconds * 1000);

        await sessionRef.set({ eventId, generatedAt, expiresAt });
        
        const checkinUrl = `${req.protocol}://${req.get('host')}/check-in/${token}`;
        const qrCodeDataUrl = await qrcode.toDataURL(checkinUrl);
        
        const studentsSnapshot = await db.collection('students').where('eventId', '==', eventId).get();
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const sessionsSnapshot = await db.collection('sessions').where('eventId', '==', eventId).orderBy('generatedAt', 'desc').get();
        const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const sessionData = { qrCodeDataUrl, checkinUrl, sessionExpiresAt: expiresAt.getTime() };
        res.render('event-management', { event: { id: eventDoc.id, ...eventData }, students, sessions, sessionData, req });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

exports.getSessionReport = async (req, res) => {
    try {
        const { eventId, sessionId } = req.params;
        const [eventDoc, sessionDoc] = await Promise.all([
            db.collection('events').doc(eventId).get(),
            db.collection('sessions').doc(sessionId).get()
        ]);

        if (!eventDoc.exists || !sessionDoc.exists) return res.status(404).send('Event or Session not found');

        const allStudentsSnapshot = await db.collection('students').where('eventId', '==', eventId).get();
        const allStudents = allStudentsSnapshot.docs.map(doc => doc.data());

        const attendanceRecordsSnapshot = await db.collection('attendanceRecords').where('sessionId', '==', sessionId).get();
        const presentStudentIds = new Set(attendanceRecordsSnapshot.docs.map(doc => doc.data().studentId));
        
        const presentStudents = allStudents.filter(s => presentStudentIds.has(s.studentId));
        const absentStudents = allStudents.filter(s => !presentStudentIds.has(s.studentId));
        
        res.render('session-report', { event: eventDoc.data(), session: sessionDoc.data(), presentStudents, absentStudents });
    } catch (error) {
        res.status(500).send(error.message);
    }
};
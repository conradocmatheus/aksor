const { admin, db } = require('../config/firebase');

exports.getLoginPage = (req, res) => {
    const firebaseClientConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };

    res.render('login', {
        firebaseConfig: JSON.stringify(firebaseClientConfig)
    });
};
exports.getSignupPage = (req, res) => res.render('signup');

exports.signupUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        await admin.auth().createUser({ email, password });
        res.redirect('/login');
    } catch (error) {
        res.status(500).send("Erro ao criar conta: " + error.message);
    }
};

exports.sessionLogin = async (req, res) => {
    const idToken = req.body.idToken.toString();
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 dias

    try {
        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
        const options = { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' };
        res.cookie('session', sessionCookie, options);
        res.end(JSON.stringify({ status: 'success' }));
    } catch (error) {
        res.status(401).send('UNAUTHORIZED REQUEST!');
    }
};

exports.logoutUser = (req, res) => {
    res.clearCookie('session');
    res.redirect('/login');
};

exports.getDashboard = async (req, res) => {
    try {
        const eventsSnapshot = await db.collection('events').where('teacherId', '==', req.user.uid).orderBy('createdAt', 'desc').get();
        const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.render('dashboard', { user: req.user, events });
    } catch (error) {
        res.status(500).send(error.message);
    }
};
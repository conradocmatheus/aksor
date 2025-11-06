const { admin } = require('../config/firebase');

exports.checkAuth = (req, res, next) => {
    const sessionCookie = req.cookies.session || '';

    admin.auth().verifySessionCookie(sessionCookie, true /** checkRevoked */)
        .then((decodedClaims) => {
            req.user = decodedClaims;
            next();
        })
        .catch((error) => {
            res.redirect('/login');
        });
};
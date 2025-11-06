const express = require('express');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const eventRoutes = require('./routes/eventRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.enable('trust proxy');

app.use('/', authRoutes);
app.use('/', attendanceRoutes);
app.use('/event', eventRoutes);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
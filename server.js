const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
const multer = require("multer");
const routes = require('./routes.js');
const db = require('./db.js');

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/uploads_dec', express.static('uploads_dec'));
app.use('/views_enchantments', express.static('views_enchantments'));

app.set('view engine', 'ejs');
app.use(
    session({
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false, // Set this to true for HTTPS
            maxAge: 6000000 // 100 minute
        }
    })
)

//destroy session
app.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(function (err) {
            if (err) {
                return console.log(err);
            }
            res.redirect('/');
        });
    }
});

app.use(routes);
app.use(db);

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
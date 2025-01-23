const express = require('express');
const path = require('path');
const router = express.Router();

const { getUsersCollection } = require('./do_connection.js');

function is_logged_in(req, res, next) {
    if (req.session.username) {
        next();
    } else {
        res.redirect('/');
    }
}

router.get('/', async (req, res) => {
    try {
        const usersCollection = getUsersCollection();
        const users = await usersCollection.find({}).toArray();

        let logged = false;

        if (req.session.username) {
            logged = true;
        }

        res.render('index', { users: users, logged: logged });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Error fetching gallery data');
    }
});

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.get('/register', (req, res) => {
    res.render('register', { error: null });
});

router.get('/my_page', is_logged_in, async (req, res) => {
    const username = req.session.username;
    try {
        const users_collection = getUsersCollection();
        const user = await users_collection.findOne({ username: username });
        res.render('my_page', { username: username, user_info: user.user_info, photos: user.photos });
    } catch (error) {
        console.error(error);
    }
});

router.get('/artist/:artist_name', async (req, res) => {
    const username = req.params.artist_name;
    try {
        const users_collection = getUsersCollection();
        const user = await users_collection.findOne({ username: username });
        res.render('artist', { username: username, user_info: user.user_info, photos: user.photos });
    } catch (error) {
        console.error(error);
    }
});

router.get('/photo/:photo_name', async (req, res) => {
    const photo_name = req.params.photo_name;
    try {
        const users_collection = getUsersCollection();
        const user = await users_collection.findOne({ photos: photo_name });
        if (user) {
            res.render('photo', { photo: photo_name, username: user.username, user_info: user.user_info })
        }
    } catch (error) {
        console.error(error);
    }
});
module.exports = router;
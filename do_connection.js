const { MongoClient } = require('mongodb');

// Database connection
const url = 'mongodb://localhost:27017';
const db_name = 'db_gallery';
let db, users_collection, photos_collection;

// Function to connect to the database
const connectToDatabase = async () => {
    if (!db) {
        const client = new MongoClient(url);
        await client.connect();
        db = client.db(db_name);
        users_collection = db.collection('users');
        console.log('Connected to MongoDB!');
    }
};

module.exports = {
    connectToDatabase,
    getUsersCollection: () => users_collection,
    getDb: () => db,
};

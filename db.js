const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
// const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { createCanvas } = require('canvas');

const { connectToDatabase, getUsersCollection } = require('./do_connection.js');
const { upload } = require('./storage.js');
(async () => {
    await connectToDatabase();
})();

const HIDDEN_WORD = 'white_mokey';

// Function to hash a string
async function hash_string(str) {
    try {
        const hash = await bcrypt.hash(str + HIDDEN_WORD, 8);
        return hash;
    } catch (error) {
        console.error('Error hashing string:', error);
    }
}

// Function for comparing a string against hash
async function compare_hash(str, hash) {
    try {
        return await bcrypt.compare(str + HIDDEN_WORD, hash);
    } catch (error) {
        console.error('Error comparing hashes:', error);
    }
}

router.post('/register', async (req, res) => {
    const { username, user_info, password } = req.body;
    const users_collection = getUsersCollection();
    const check_if_user_exists = await users_collection.findOne({ username });
    if (check_if_user_exists) {
        return res.status(400).render('register', { error: 'Username already exists' });
    }

    const hashed_password = await hash_string(password);
    await users_collection.insertOne(
        {
            username: username,
            user_info: user_info,
            password: hashed_password,
            photos: []
        });
    req.session.username = username;
    res.redirect('/my_page');
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const users_collection = getUsersCollection();
    const user = await users_collection.findOne({ username: username });

    if (!user) {
        return res.status(401).render('login', { error: 'Invalid credentials' });
    }
    const password_match = await compare_hash(password, user.password);

    if (!password_match) {
        return res.status(401).render('login', { error: 'Invalid credentials' });
    }
    req.session.username = username;

    console.log(username, "has logged in!");
    res.redirect('/my_page');
});

router.post('/update_user_info', async (req, res) => {
    const { user_info } = req.body;
    try {
        const users_collection = getUsersCollection();

        const username = req.session.username;
        await users_collection.updateOne(
            { username: username },
            { $set: { user_info: user_info } }
        );
        res.redirect('/my_page');
    } catch (error) {
        console.log(error);
    }
});

router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const usersCollection = getUsersCollection();

    const uploadedFilePath = req.file.path;
    const uploadedFileName = req.file.originalname;

    const username = req.session.username;

    console.log(req.body);
    const photo_name = uploadedFileName.replace('.dat', '');

    try {
        // Read the uploaded .dat file
        const encryptedData = JSON.parse(fs.readFileSync(uploadedFilePath, 'utf8'));

        const width = encryptedData.width;
        const height = encryptedData.height;
        const decryptedPixels = decryptPixels(encryptedData, ''); // Empty password for decryption

        // Create a canvas to save the decrypted image
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(new Uint8ClampedArray(decryptedPixels));
        ctx.putImageData(imageData, 0, 0);

        // Ensure the `uploads_dec` folder exists
        const outputDir = path.join(__dirname, 'uploads_dec');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        // Save the decrypted image as PNG
        const outputFilePath = path.join(outputDir, uploadedFileName.replace('.dat', '.png'));
        const outStream = fs.createWriteStream(outputFilePath);
        const pngStream = canvas.createPNGStream();

        pngStream.pipe(outStream);
        outStream.on('finish', async () => {
            await usersCollection.updateOne(
                { username: username },
                { $addToSet: { photos: photo_name } }
            );
            console.log('Image updated successfully!');
            res.send(`Decrypted image saved at ${outputFilePath}`);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to decrypt the image.');
    }
});

router.post('/delete_photo', async (req, res) => {
    const { photo_name } = req.body;
    const username = req.session.username;

    if (!username) {
        return res.status(401).send('Unauthorized: User not logged in.');
    }

    try {
        const usersCollection = getUsersCollection();

        // Remove the photo from the user's photo array in the database
        const result = await usersCollection.updateOne(
            { username: username },
            { $pull: { photos: photo_name } }
        );

        if (result.modifiedCount > 0) {
            console.log(`Photo "${photo_name}" deleted for user "${username}".`);

            // Define file paths for .dat and .png files
            const datFilePath = path.join(__dirname, 'uploads', `${photo_name}.dat`);
            const pngFilePath = path.join(__dirname, 'uploads_dec', `${photo_name}.png`);

            // Delete the .dat file
            if (fs.existsSync(datFilePath)) {
                fs.unlinkSync(datFilePath);
                console.log(`File "${datFilePath}" deleted successfully.`);
            }

            // Delete the .png file
            if (fs.existsSync(pngFilePath)) {
                fs.unlinkSync(pngFilePath);
                console.log(`File "${pngFilePath}" deleted successfully.`);
            }

            res.redirect('/my_page');
        } else {
            console.log(`Photo "${photo_name}" not found for user "${username}".`);
        }
    } catch (error) {
        console.error('Error deleting photo and files:', error);
        res.status(500).send('Failed to delete photo and files.');
    }
});


function decryptPixels(encryptedData, password) {
    const hashPassword = (password) => {
        let hash = 0;
        if (password.length === 0) return hash;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash &= hash;
        }
        return Math.abs(hash % 256);
    };

    const decryptionKey = hashPassword(password);
    const pixels = encryptedData.pixels;

    for (let i = encryptedData.encryptStartPixel * 4; i < pixels.length; i += 4) {
        pixels[i] = pixels[i] ^ decryptionKey;     // Red
        pixels[i + 1] = pixels[i + 1] ^ decryptionKey; // Green
        pixels[i + 2] = pixels[i + 2] ^ decryptionKey; // Blue
        // Alpha (i + 3) remains unchanged
    }

    return pixels;
}


module.exports = router;
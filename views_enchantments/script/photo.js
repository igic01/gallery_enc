console.log(photo_name)

const decryptBtn = document.getElementById('decryptBtn');
const downloadBtn = document.getElementById('downloadBtn');
const passwordInput = document.getElementById('password');
const decryptedCanvas = document.getElementById('decryptedCanvas');
const decryptedCtx = decryptedCanvas.getContext('2d');

// Simple hashing function for password
function hashPassword(password) {
    let hash = 0;
    if (password.length === 0) return hash;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash &= hash; // Convert to 32bit integer
    }
    return Math.abs(hash % 256); // Ensure it's a valid byte value
}

decryptBtn.addEventListener('click', () => {
    const password = passwordInput.value.trim();
    if (!password) {
        alert('Please enter the password for decryption.');
        return;
    }

    fetch(`/uploads/${photo_name}.dat`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch the .dat file from the server.');
            }
            return response.text();
        })
        .then(data => {
            try {
                const encryptedData = JSON.parse(data);

                const width = encryptedData.width;
                const height = encryptedData.height;
                const encryptStartPixel = encryptedData.encryptStartPixel;
                const pixels = encryptedData.pixels;

                decryptedCanvas.width = width;
                decryptedCanvas.height = height;

                const decryptionKey = hashPassword(password);

                // Decrypt the pixel data with the provided password
                for (let i = encryptStartPixel * 4; i < pixels.length; i += 4) {
                    pixels[i] = pixels[i] ^ decryptionKey; // Red
                    pixels[i + 1] = pixels[i + 1] ^ decryptionKey; // Green
                    pixels[i + 2] = pixels[i + 2] ^ decryptionKey; // Blue
                    // Alpha (i + 3) remains unchanged
                }

                const imageData = new ImageData(
                    new Uint8ClampedArray(pixels),
                    width,
                    height
                );

                decryptedCtx.putImageData(imageData, 0, 0);
                alert('Decryption attempt completed! If the password is correct, the image will look normal.');

                // Show Download Button
                downloadBtn.style.display = 'inline';
            } catch (error) {
                console.error(error);
                alert('Invalid file format or decryption failed!');
            }
        })
        .catch(error => {
            console.error(error);
            alert('Failed to retrieve the .dat file. Please try again later.');
        });
});

// Download Decrypted Image as PNG
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'decrypted_image.png';
    link.href = decryptedCanvas.toDataURL('image/png');
    link.click();
});
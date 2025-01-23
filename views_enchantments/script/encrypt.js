const fileInput = document.getElementById('file');
const passwordInput = document.getElementById('password');
const processBtn = document.getElementById('processBtn');
const uploadBtn = document.getElementById('uploadBtn');
const originalCanvas = document.getElementById('originalCanvas');
const processedCanvas = document.getElementById('processedCanvas');
const originalCtx = originalCanvas.getContext('2d');
const processedCtx = processedCanvas.getContext('2d');

let encryptedDataBlob = null;

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];

    if (file && file.type === 'image/png') {
        const reader = new FileReader();
        reader.onload = (event) => {
            const image = new Image();
            image.src = event.target.result;

            image.onload = () => {
                originalCanvas.width = image.width;
                originalCanvas.height = image.height;
                originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
                originalCtx.drawImage(image, 0, 0);
            };
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please select a valid PNG file.');
    }
});

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

processBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    const password = passwordInput.value.trim();

    if (!file) {
        alert('Please select a PNG file.');
        return;
    }

    if (file.type !== 'image/png') {
        alert('Only PNG files are allowed.');
        return;
    }

    if (!password) {
        alert('Please provide a password for encryption.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const image = new Image();
        image.src = event.target.result;

        image.onload = () => {
            processedCanvas.width = image.width;
            processedCanvas.height = image.height;
            processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
            processedCtx.drawImage(image, 0, 0);

            const imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
            const data = imageData.data;
            const encryptionKey = hashPassword(password);
            const totalPixels = processedCanvas.width * processedCanvas.height;
            const encryptStart = Math.floor(totalPixels / 2);

            for (let i = encryptStart * 4; i < data.length; i += 4) {
                data[i] = data[i] ^ encryptionKey;
                data[i + 1] = data[i + 1] ^ encryptionKey;
                data[i + 2] = data[i + 2] ^ encryptionKey;
            }

            processedCtx.putImageData(imageData, 0, 0);

            const encryptedData = {
                width: processedCanvas.width,
                height: processedCanvas.height,
                encryptStartPixel: encryptStart,
                passwordHash: encryptionKey,
                pixels: Array.from(data)
            };

            encryptedDataBlob = new Blob([JSON.stringify(encryptedData)], {
                type: 'application/octet-stream'
            });
            alert('Image processed successfully. You can now upload it.');
        };
    };
    reader.readAsDataURL(file);
});

uploadBtn.addEventListener('click', () => {
    if (!encryptedDataBlob) {
        alert('Please process the image before uploading.');
        return;
    }

    const photoName = document.getElementById('photoName').value.trim();
    if (!photoName) {
        alert('Please provide a name for the photo.');
        return;
    }

    const formData = new FormData();
    formData.append('file', encryptedDataBlob, `${photoName}_encrypted_image.dat`);

    fetch('/upload', {
        method: 'POST',
        body: formData,
    })
        .then((response) => {
            if (response.ok) {
                alert('File successfully uploaded.');
                location.reload();
            } else {
                alert('Failed to upload file.');
            }
        })
        .catch(() => {
            alert('An error occurred during file upload.');
        });
});
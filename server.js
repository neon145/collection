const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

// --- Middleware ---
// Enable Cross-Origin Resource Sharing
app.use(cors()); 
// Parse JSON bodies, increase limit to handle base64 images
app.use(bodyParser.json({ limit: '50mb' })); 

// **FIX:** Explicitly set the correct MIME type for .tsx and .ts files.
// The browser enforces strict MIME type checking for modules, and Babel needs to fetch these.
app.use((req, res, next) => {
  if (req.path.endsWith('.tsx') || req.path.endsWith('.ts')) {
    res.type('application/javascript; charset=UTF-8');
  }
  next();
});

// Serve static files (HTML, CSS, TSX) from the root directory
app.use(express.static(path.join(__dirname, '')));

// --- API Endpoints ---

// GET /api/data: Reads the db.json file and sends the collection data to the client.
app.get('/api/data', (req, res) => {
    fs.readFile(DB_PATH, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading database file:', err);
            return res.status(500).send('Error: Could not read data from the server.');
        }
        res.json(JSON.parse(data));
    });
});

// POST /api/data: Receives collection data from the client and writes it to the db.json file.
app.post('/api/data', (req, res) => {
    const newData = req.body;
    fs.writeFile(DB_PATH, JSON.stringify(newData, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing to database file:', err);
            return res.status(500).send('Error: Could not save data to the server.');
        }
        res.status(200).send('Data saved successfully.');
    });
});
    
// --- Fallback ---
// For any route not matched above, serve the main index.html file.
// This is crucial for a single-page application (SPA) to handle routing correctly.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Server Start ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  Mineral Collection Server is running!`);
    console.log(`  You can now view your app on this computer at:`);
    console.log(`  http://localhost:${PORT}`);
    console.log(` `);
    console.log(`  To view from another device on the same network,`);
    console.log(`  find your computer's local IP address and open:`);
    console.log(`  http://<YOUR_LOCAL_IP>:${PORT}`);
    console.log(`====================================================`);
});
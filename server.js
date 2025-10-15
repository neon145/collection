const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

// --- Middleware ---
app.use(cors()); 
app.use(bodyParser.json({ limit: '50mb' })); 

// Set the correct MIME type for .tsx and .ts files so in-browser Babel can fetch them.
app.use((req, res, next) => {
  if (req.path.endsWith('.tsx') || req.path.endsWith('.ts')) {
    res.type('application/javascript; charset=UTF-8');
  }
  next();
});

// --- API Endpoints (Define BEFORE static files) ---
// This ensures that API calls are never mistaken for file requests.

// GET /api/data: Reads the db.json file and sends the collection data.
app.get('/api/data', (req, res) => {
    fs.readFile(DB_PATH, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading database file:', err);
            return res.status(500).send('Error: Could not read data from the server.');
        }
        res.json(JSON.parse(data));
    });
});

// POST /api/data: Receives collection data and writes it to db.json.
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

// --- Static File Serving ---
// Serve static files (HTML, CSS, TSX) from the root directory.
// This comes AFTER the API routes.
app.use(express.static(path.join(__dirname, '')));

// --- Fallback Route (Define LAST) ---
// For any route not matched above, serve the main index.html file.
// This is crucial for a single-page application (SPA) to handle client-side routing.
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
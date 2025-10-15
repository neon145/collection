import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- API Endpoints ---
app.get('/api/data', (req, res) => {
    fs.readFile(DB_PATH, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading database file:', err);
            return res.status(500).send('Error: Could not read data from the server.');
        }
        res.json(JSON.parse(data));
    });
});

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

// --- Static File Serving (for Production) ---
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// --- Fallback Route for SPA ---
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// --- Server Start ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  Mineral Collection Server is running on port ${PORT}`);
    console.log(`====================================================`);
});
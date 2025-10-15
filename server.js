import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import * as geminiApi from './gemini-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- API Endpoints ---

// Database endpoints
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

// AI endpoints - Securely proxying requests to Gemini API
const createApiHandler = (apiFunction) => async (req, res) => {
    try {
        const result = await apiFunction(req.body);
        res.json(result);
    } catch (error) {
        console.error(`Error in AI API endpoint:`, error);
        res.status(500).json({ error: 'An error occurred with the AI service.' });
    }
};

app.post('/api/ai/generate-description', createApiHandler(geminiApi.generateDescription));
app.post('/api/ai/suggest-rarity', createApiHandler(geminiApi.suggestRarity));
app.post('/api/ai/identify-specimen', createApiHandler(geminiApi.identifySpecimen));
app.post('/api/ai/remove-background', createApiHandler(geminiApi.removeImageBackground));
app.post('/api/ai/clean-image', createApiHandler(geminiApi.cleanImage));
app.post('/api/ai/clarify-image', createApiHandler(geminiApi.clarifyImage));
app.post('/api/ai/generate-layout', createApiHandler(geminiApi.generateHomepageLayout));


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
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_FILE = 'api.json';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const loadData = () => {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE);
        return JSON.parse(data);
    }
    return [];
};

const saveData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

app.get('/api/qa', (req, res) => {
    const data = loadData();
    res.json(data);
});

app.post('/api/qa', (req, res) => {
    const { question, answer } = req.body;
    const data = loadData();
    data.push({ question, answer });
    saveData(data);
    res.status(201).json({ message: 'Q&A added successfully!' });
});

app.get('/api/search', (req, res) => {
    const keyword = req.query.q.toLowerCase();
    const data = loadData();
    const results = data.filter(item => item.question.toLowerCase().includes(keyword));
    res.json(results);
});

app.get('/api/qknowledge', (req, res) => {
    const keyword = req.query.q;

    if (!keyword) {
        return res.status(400).json({ message: 'Keyword is required.' });
    }

    const data = loadData();
    const filteredResults = data.filter(item => item.question.toLowerCase().includes(keyword.toLowerCase()));

    if (filteredResults.length > 0) {
        const randomIndex = Math.floor(Math.random() * filteredResults.length);
        res.json(filteredResults[randomIndex]);
    } else {
        res.json({ message: 'No results found for the given keyword.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

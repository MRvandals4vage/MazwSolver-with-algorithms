const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PROJECT_DIR = path.resolve(__dirname, '..');

// Get all available mazes in mazes_input
app.get('/api/mazes', (req, res) => {
    const mazesDir = path.join(PROJECT_DIR, 'mazes_input');
    if (!fs.existsSync(mazesDir)) {
        return res.json([]);
    }
    const files = fs.readdirSync(mazesDir).filter(f => f.endsWith('.csv'));
    res.json(files);
});

// Generate new mazes
app.post('/api/generate', (req, res) => {
    const { numMazes = 1, display = 1 } = req.body;
    const pythonExe = fs.existsSync(path.join(PROJECT_DIR, '.venv', 'bin', 'python3')) 
        ? path.join(PROJECT_DIR, '.venv', 'bin', 'python3')
        : 'python3';
    const cmd = `"${pythonExe}" maze_generator.py --display=${display} --num_mazes=${numMazes}`;
    
    exec(cmd, { cwd: PROJECT_DIR }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: error.message });
        }
        res.json({ message: 'Maze generated successfully', stdout });
    });
});

// Solve maze with an algorithm
app.post('/api/solve', (req, res) => {
    const { algorithm, mazeFile, display = 1 } = req.body;
    let cmd = '';
    
    // Use the venv python interpreter directly, fallback to global Python3 for Deployment
    const pythonExe = fs.existsSync(path.join(PROJECT_DIR, '.venv', 'bin', 'python3')) 
        ? path.join(PROJECT_DIR, '.venv', 'bin', 'python3')
        : 'python3';

    if (['astar', 'bfs', 'dfs'].includes(algorithm)) {
        cmd = `"${pythonExe}" ${algorithm}.py --display=${display} --maze_file=${mazeFile}`;
    } else {
        return res.status(400).json({ error: 'Invalid algorithm' });
    }
    
    exec(cmd, { cwd: path.join(PROJECT_DIR, 'algorithms') }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: error.message });
        }
        res.json({ message: 'Solved maze', stdout });
    });
});

// Visualize the maze with main.py
app.post('/api/visualize', (req, res) => {
    const { algorithm, mazeFile } = req.body;
    const algoArg = algorithm ? `--algorithm=${algorithm}` : '';
    const pythonExe = path.join(PROJECT_DIR, '.venv', 'bin', 'python3');
    const cmd = `"${pythonExe}" main.py ${algoArg} --maze_file=${mazeFile}`;
    
    exec(cmd, { cwd: PROJECT_DIR }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: error.message });
        }
        res.json({ message: 'Visualization completed', stdout });
    });
});

// Fetch raw grid data to visualize natively in React
app.get('/api/grid', (req, res) => {
    const { algorithm, mazeFile } = req.query;
    let filePath;
    if (algorithm) {
        let algoFolder = algorithm;
        if (algorithm === 'aStar') algoFolder = 'astar';
        let prefix = algorithm;
        if (algorithm === 'aStar') prefix = 'astar';
        filePath = path.join(PROJECT_DIR, 'mazes_output', algoFolder, `${prefix}_${mazeFile}`);
    } else {
        filePath = path.join(PROJECT_DIR, 'mazes_input', mazeFile);
    }
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Grid file not found. Ensure algorithm has generated it.' });
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const grid = content
            .trim()
            .split('\n')
            .map(line => line.split(',').map(Number));
        res.json({ grid });
    } catch (err) {
        res.status(500).json({ error: 'Failed to read grid format' });
    }
});

// Fetch history of exploration to animate natively in React
app.get('/api/history', (req, res) => {
    const { algorithm, mazeFile } = req.query;
    let algoFolder = algorithm;
    if (algorithm === 'aStar') algoFolder = 'astar';
    let prefix = algorithm;
    if (algorithm === 'aStar') prefix = 'astar';
    
    const filePath = path.join(PROJECT_DIR, 'mazes_output', algoFolder, `${prefix}_${mazeFile}`.replace('.csv', '.json'));
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'History file not found.' });
    }
    
    try {
        const history = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: 'Failed to parse history' });
    }
});

// Serve standard static React frontend
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

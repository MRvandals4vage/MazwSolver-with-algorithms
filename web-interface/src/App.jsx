import React, { useState, useEffect, useRef } from 'react';
import { Play, Settings, RefreshCw, Box, Terminal, Zap, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import characterHeadImg from './assets/character_head.png';
import './index.css';

function App() {
  const [mazes, setMazes] = useState([]);
  const [selectedMaze, setSelectedMaze] = useState('');
  const [algorithm, setAlgorithm] = useState('astar');
  const [numMazes, setNumMazes] = useState(1);
  
  const [logs, setLogs] = useState([{ type: 'info', text: 'Maze AI System Initialized. 100% Native Web Rendering.' }]);
  const [status, setStatus] = useState('idle'); // idle, running, error
  const logsEndRef = useRef(null);
  const canvasRef = useRef(null);
  const headCanvasRef = useRef(null);
  const [gridData, setGridData] = useState(null);
  const [animationHistory, setAnimationHistory] = useState(null);
  const [animSpeed, setAnimSpeed] = useState(5);
  const headImageRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.src = characterHeadImg;
    img.onload = () => {
      headImageRef.current = img;
    };
    if (img.complete) {
      headImageRef.current = img;
    }
  }, []);

  // Allow configuring backend URL for separated Vercel + Render deployments
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // Colors based on main.py
  const idxToColor = [
    '#485460', // 0: black (wall)
    '#ffffff', // 1: white (space)
    '#2ed573', // 2: green (start)
    '#ff4757', // 3: red (goal)
    '#70a1ff', // 4: blue (current/explored)
    '#ffa502'  // 5: magenta (solution)
  ];

  useEffect(() => {
    if (gridData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const numRows = gridData.length;
      const numCols = gridData[0].length;
      
      const width = 12;
      const height = 12;
      const margin = 1;
      
      canvas.width = (width + margin) * numCols + margin;
      canvas.height = (height + margin) * numRows + margin;
      
      let headCtx = null;
      let headCanvas = null;
      if (headCanvasRef.current) {
         headCanvas = headCanvasRef.current;
         headCanvas.width = canvas.width;
         headCanvas.height = canvas.height;
         headCtx = headCanvas.getContext('2d');
      }
      
      // Draw Base Grid Background
      ctx.fillStyle = '#f1f2f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const val = gridData[r][c];
          ctx.fillStyle = idxToColor[val] || '#000000';
          ctx.fillRect(
            margin + (width + margin) * c,
            margin + (height + margin) * r,
            width, height
          );
        }
      }

      // Draw Animation if history exists
      let animFrame;
      if (animationHistory) {
         let step = 0;
         const { explored, path, mode } = animationHistory;
         
         let nodesToAnimate = [];
         if (mode === 'explored') {
            nodesToAnimate = explored.map(n => ({ r: n[0], c: n[1], type: 4 }));
         } else if (mode === 'optimal') {
            nodesToAnimate = path.map(n => ({ r: n[0], c: n[1], type: 5 }));
         } else {
            // solved or fallback
            nodesToAnimate = [
               ...explored.map(n => ({ r: n[0], c: n[1], type: 4 })),
               ...path.map(n => ({ r: n[0], c: n[1], type: 5 }))
            ];
         }

         const totalSteps = nodesToAnimate.length;
         // Make speeds physically slower by dividing the slider value.
         // A slider value of 1 equals 1/3 of a step per frame (or 1 step every 3 frames).
         let speed = animSpeed / 3; 
         let stepAccumulator = 0;

          const renderFrame = () => {
             // We no longer need manual cleanup on the main canvas!
             // Just clean the entire headCanvas overlay.
             if (headCtx && headCanvas) {
                 headCtx.clearRect(0, 0, headCanvas.width, headCanvas.height);
             }

             // Accumulate fractional steps
             stepAccumulator += speed;
             const stepsThisFrame = Math.floor(stepAccumulator);
             stepAccumulator -= stepsThisFrame;

             // Paint multiple steps based on speed ON THE MAIN CANVAS
             for (let i = 0; i < stepsThisFrame; i++) {
                 if (step < totalSteps) {
                     const { r, c, type } = nodesToAnimate[step];
                     if (gridData[r][c] !== 2 && gridData[r][c] !== 3) {
                         ctx.fillStyle = idxToColor[type];
                         ctx.fillRect(margin + (width + margin) * c, margin + (height + margin) * r, width, height);
                     }
                     step++;
                 } else {
                     break; 
                 }
             }

             // Draw head at the new front line exclusively on headCanvas
             if (step > 0 && headCtx) {
                 const lastDrawn = nodesToAnimate[step - 1];
                 const cx = margin + (width + margin) * lastDrawn.c;
                 const cy = margin + (height + margin) * lastDrawn.r;
                 
                 // Make the head 4x the size of the block! (Bigger character head)
                 const headSize = width * 4.0;
                 const offset = (headSize - width) / 2;
                 
                 // Add fun shadow to the head
                 headCtx.shadowColor = "rgba(0,0,0,0.4)";
                 headCtx.shadowBlur = 8;
                 headCtx.shadowOffsetY = 4;
                 
                 // Only draw if image is valid, otherwise fallback
                 if (headImageRef.current && headImageRef.current.complete && headImageRef.current.naturalWidth > 0) {
                     headCtx.drawImage(
                         headImageRef.current, 
                         cx - offset, 
                         cy - offset - 4, // floating slightly upwards
                         headSize, 
                         headSize
                     );
                 } else {
                     headCtx.font = `${headSize}px Arial`;
                     headCtx.textAlign = "center";
                     headCtx.textBaseline = "middle";
                     headCtx.fillText("🤖", cx + width/2, cy + height/2);
                 }
                 
                 // reset shadows safely
                 headCtx.shadowColor = "transparent";
             }

             if (step < totalSteps) {
                 animFrame = requestAnimationFrame(renderFrame);
             } else if (animationHistory.mode === 'optimal' || !animationHistory.mode) {
                 // For optimal/solved, stay showing
             }
         };
         animFrame = requestAnimationFrame(renderFrame);
      }
      return () => {
         if (animFrame) cancelAnimationFrame(animFrame);
      }
    }
  }, [gridData, animationHistory]);

  useEffect(() => {
    fetchMazes();
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (text, type = 'info') => {
    setLogs(prev => [...prev, { text, type }]);
  };

  const fetchMazes = async (autoSelectLatest = false) => {
    try {
      const res = await fetch(`${API_BASE}/api/mazes`);
      const data = await res.json();
      setMazes(data);
      if (data.length > 0) {
        if (autoSelectLatest || !selectedMaze) {
          // Select the chronologically latest or highest number
          const latest = [...data].sort((a, b) => b.localeCompare(a, undefined, {numeric: true}))[0];
          setSelectedMaze(latest);
          return latest;
        }
      }
    } catch {
      addLog('Failed to fetch maze list.', 'error');
    }
    return null;
  };

  const handleGenerate = async () => {
    setStatus('running');
    addLog(`Generating ${numMazes} maze(s) natively...`);
    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numMazes, display: 0 }) // Always disable Pygame
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addLog(data.stdout || data.message, 'success');
      
      const latestMaze = await fetchMazes(true);
      if (latestMaze) {
         handleVisualize('original', latestMaze);
      } else {
         setStatus('idle');
      }
    } catch (err) {
      addLog(err.message, 'error');
      setStatus('error');
    }
  };

  const handleSolve = async () => {
    if (!selectedMaze) {
      addLog('Please select a maze first.', 'error');
      return;
    }
    setStatus('running');
    addLog(`Solving ${selectedMaze} using ${algorithm.toUpperCase()}...`);
    try {
      const res = await fetch(`${API_BASE}/api/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm, mazeFile: selectedMaze, display: 0 }) // Always disable pygame
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addLog(data.stdout || data.message, 'success');
      
      // Auto visualize after solving
      handleVisualize('solved', selectedMaze);
    } catch (err) {
      addLog(err.message, 'error');
      setStatus('error');
    }
  };

  const handleVisualize = async (mode = 'original', targetMazeOverride = null) => {
    const targetMaze = targetMazeOverride || selectedMaze;
    if (!targetMaze) {
      addLog('Please select a maze first.', 'error');
      return;
    }
    
    setStatus('running');
    addLog(`Rendering ${mode === 'solved' ? 'solved animation for ' : ''}${targetMaze} natively...`);
    try {
      // 1. Fetch un-solved grid base
      const gridQuery = new URLSearchParams({ mazeFile: targetMaze });
      const resGrid = await fetch(`${API_BASE}/api/grid?${gridQuery}`);
      const dataGrid = await resGrid.json();
      if (!resGrid.ok) throw new Error(dataGrid.error);
      
      setGridData(dataGrid.grid);

      // 2. Fetch history for animation if mode requires it
      if (mode === 'solved' || mode === 'explored' || mode === 'optimal') {
          const algoParam = algorithm === 'astar' ? 'aStar' : algorithm;
          const histQuery = new URLSearchParams({ mazeFile: targetMaze, algorithm: algoParam });
          const resHist = await fetch(`${API_BASE}/api/history?${histQuery}`);
          
          if (resHist.ok) {
              const histData = await resHist.json();
              setAnimationHistory({ ...histData, mode });
          } else {
              setAnimationHistory(null);
              throw new Error('Animation history not found. Has it been solved yet?');
          }
      } else {
          setAnimationHistory(null);
      }
      
      addLog('Successfully rendered maze to dashboard.', 'success');
      setStatus('idle');
    } catch (err) {
      addLog(err.message, 'error');
      setStatus('error');
    }
  };

  const getStatusIcon = () => {
    if (status === 'running') return <RefreshCw className="animate-spin" size={16} />;
    if (status === 'error') return <AlertCircle size={16} />;
    return <CheckCircle2 size={16} />;
  };

  return (
    <>
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
      
      <div className="app-container">
        
        {/* Controls Sidebar */}
        <div className="panel side-panel">
          <div className="header">
            <h1>Maze AI</h1>
            <p>Control Interface</p>
            <div className={`status-badge ${status}`}>
              {getStatusIcon()}
              <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
            </div>
          </div>

          <div className="panel-title">
            <Box size={20} />
            Generation
          </div>
          
          <div className="control-group">
            <label className="control-label">Number of Mazes</label>
            <input 
              type="number" 
              className="input-box" 
              value={numMazes} 
              min="1" 
              onChange={(e) => setNumMazes(parseInt(e.target.value) || 1)}
            />
          </div>

          <button 
            className="btn btn-primary" 
            onClick={handleGenerate}
            disabled={status === 'running'}
          >
            <RefreshCw size={18} className={status === 'running' ? 'animate-spin' : ''} />
            Generate Maze(s)
          </button>

          <div style={{ margin: '1rem 0', borderTop: '1px solid var(--panel-border)' }}></div>

          <div className="panel-title">
            <Zap size={20} />
            Solving AI
          </div>

          <div className="control-group">
            <label className="control-label">Algorithm</label>
            <div className="options-grid">
              {['astar', 'bfs', 'dfs'].map((alg) => (
                <label key={alg} className={`radio-card ${algorithm === alg ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="algorithm" 
                    value={alg} 
                    checked={algorithm === alg} 
                    onChange={(e) => setAlgorithm(e.target.value)} 
                  />
                  {alg.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          <div className="control-group" style={{ marginTop: '0.5rem' }}>
            <label className="control-label">Target Maze</label>
            <select 
              className="select-box"
              value={selectedMaze}
              onChange={(e) => setSelectedMaze(e.target.value)}
            >
              {mazes.length === 0 && <option value="">No mazes found</option>}
              {mazes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="control-group" style={{ marginTop: '0.5rem' }}>
            <label className="control-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Animation Speed</span>
              <span>{animSpeed}x</span>
            </label>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={animSpeed} 
              onChange={(e) => setAnimSpeed(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
          </div>

          <button 
            className="btn btn-success" 
            onClick={handleSolve}
            disabled={status === 'running' || !selectedMaze}
            style={{ marginTop: '0.5rem' }}
          >
            <Play size={18} />
            Solve Maze
          </button>
          
          <div className="options-grid" style={{ marginTop: '0.5rem' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleVisualize('original')}
              disabled={status === 'running' || !selectedMaze}
              style={{ fontSize: '0.9rem', padding: '0.6rem', gridColumn: 'span 2' }}
            >
              <Eye size={16} /> Original
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleVisualize('explored')}
              disabled={status === 'running' || !selectedMaze}
              style={{ fontSize: '0.9rem', padding: '0.6rem' }}
            >
              <Eye size={16} /> Explored
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleVisualize('optimal')}
              disabled={status === 'running' || !selectedMaze}
              style={{ fontSize: '0.9rem', padding: '0.6rem' }}
            >
              <CheckCircle2 size={16} /> Optimal
            </button>
          </div>

        </div>

        {/* Visualizer / Console Panel */}
        <div className="panel main-panel" style={{ height: '100%' }}>
          <div className="panel-title">
            <Terminal size={20} />
            System Console & Visualizer
          </div>
          
          {gridData && (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0', padding: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <canvas ref={canvasRef} id="maze-canvas" />
                <canvas 
                  ref={headCanvasRef} 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    pointerEvents: 'none', 
                    background: 'transparent', 
                    boxShadow: 'none', 
                    border: 'none' 
                  }} 
                />
              </div>
            </div>
          )}

          <div className="console-panel">
            {logs.map((log, i) => (
              <div key={i} className={`console-output ${log.type === 'error' ? 'error' : log.type === 'info' ? 'info' : ''}`} style={{ marginBottom: '8px' }}>
                <span style={{ opacity: 0.5, marginRight: '8px' }}>[{new Date().toLocaleTimeString()}]</span>
                {log.text}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
             Execution outputs and python script status appear here. Visualizations are fully embedded.
          </div>
        </div>

      </div>
    </>
  );
}

export default App;

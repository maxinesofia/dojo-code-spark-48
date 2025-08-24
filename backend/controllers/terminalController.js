const { spawn } = require('child_process');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const os = require('os');
const gcpFirecrackerService = require('../services/gcpFirecrackerService');
const { Project, File } = require('../models');

class TerminalController {
  constructor() {
    this.activeSessions = new Map();
    this.wsConnections = new Map();
  }

  // Initialize WebSocket server for terminal sessions
  initializeWebSocketServer(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/terminal' 
    });

    this.wss.on('connection', (ws, req) => {
      const sessionId = uuidv4();
      console.log(`New terminal session: ${sessionId}`);
      
      this.wsConnections.set(sessionId, ws);
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          await this.handleWebSocketMessage(sessionId, message, ws);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            data: error.message 
          }));
        }
      });

      ws.on('close', () => {
        console.log(`Terminal session closed: ${sessionId}`);
        this.cleanup(sessionId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for session ${sessionId}:`, error);
        this.cleanup(sessionId);
      });

      // Send session ID to client
      ws.send(JSON.stringify({ 
        type: 'session_init', 
        sessionId,
        message: 'Terminal session initialized' 
      }));
    });
  }

  async handleWebSocketMessage(sessionId, message, ws) {
    const { type, data } = message;

    switch (type) {
      case 'start_terminal':
        await this.startTerminalSession(sessionId, data, ws);
        break;
      
      case 'command':
        await this.executeCommand(sessionId, data, ws);
        break;
      
      case 'resize':
        await this.resizeTerminal(sessionId, data, ws);
        break;
      
      case 'stop':
        await this.stopTerminalSession(sessionId, ws);
        break;
      
      default:
        ws.send(JSON.stringify({ 
          type: 'error', 
          data: `Unknown message type: ${type}` 
        }));
    }
  }

  async startTerminalSession(sessionId, data, ws) {
    try {
      const { projectId, userId } = data;

      // Get project files for context
      const project = await Project.findOne({
        where: { id: projectId, userId },
        include: [File]
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Create or get VM for this project
      let vmId = project.executionId;
      
      if (!vmId || project.executionStatus !== 'running') {
        // Start new VM with project files
        const files = {};
        project.Files.forEach(file => {
          files[file.name] = file.content;
        });

        const result = await gcpFirecrackerService.executeCode(files, 'terminal');
        vmId = result.vmId;

        // Update project with VM info
        await project.update({
          executionStatus: 'running',
          executionId: vmId,
          executionUrl: `http://34.75.79.84:8080/${vmId}`,
          lastExecuted: new Date()
        });
      }

      // Connect to VM terminal
      const terminalProcess = await this.connectToVMTerminal(vmId);
      
      this.activeSessions.set(sessionId, {
        vmId,
        projectId,
        userId,
        process: terminalProcess,
        startTime: new Date()
      });

      // Setup terminal process handlers
      terminalProcess.stdout.on('data', (data) => {
        ws.send(JSON.stringify({
          type: 'output',
          data: data.toString()
        }));
      });

      terminalProcess.stderr.on('data', (data) => {
        ws.send(JSON.stringify({
          type: 'output',
          data: data.toString()
        }));
      });

      terminalProcess.on('close', (code) => {
        ws.send(JSON.stringify({
          type: 'process_exit',
          code
        }));
        this.cleanup(sessionId);
      });

      ws.send(JSON.stringify({
        type: 'terminal_started',
        vmId,
        message: 'Terminal session started successfully'
      }));

    } catch (error) {
      console.error('Start terminal session error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: error.message
      }));
    }
  }

  async connectToVMTerminal(vmId) {
    // Create a working directory for this session
    const sessionDir = path.join(os.tmpdir(), `terminal-${vmId}`);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
      
      // Initialize as git repository
      try {
        const initProcess = spawn('git', ['init'], { cwd: sessionDir });
        await new Promise((resolve) => initProcess.on('close', resolve));
        
        // Set basic git config
        spawn('git', ['config', 'user.name', 'Developer'], { cwd: sessionDir });
        spawn('git', ['config', 'user.email', 'dev@example.com'], { cwd: sessionDir });
      } catch (error) {
        console.log('Git not available, skipping repository initialization');
      }
    }

    // Determine shell based on platform
    let shell, shellArgs;
    if (process.platform === 'win32') {
      // Use Git Bash on Windows if available, otherwise cmd
      const gitBashPath = 'C:\\Program Files\\Git\\bin\\bash.exe';
      if (fs.existsSync(gitBashPath)) {
        shell = gitBashPath;
        shellArgs = ['--login'];
      } else {
        shell = 'cmd.exe';
        shellArgs = [];
      }
    } else {
      // Use bash on Unix-like systems
      shell = '/bin/bash';
      shellArgs = ['--login'];
    }
    
    const terminalProcess = spawn(shell, shellArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: sessionDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        PS1: '\\[\\033[32m\\]developer@tutorials-dojo\\[\\033[0m\\]:\\[\\033[34m\\]\\w\\[\\033[0m\\]$ ',
        HOME: sessionDir,
        PATH: process.env.PATH,
        SHELL: shell,
        TERM_PROGRAM: 'tutorials-dojo'
      }
    });

    // Send initial commands to set up the environment
    setTimeout(() => {
      if (process.platform !== 'win32') {
        terminalProcess.stdin.write('clear\n');
      }
      terminalProcess.stdin.write('echo "Welcome to Tutorials Dojo Terminal"\n');
      terminalProcess.stdin.write('echo "Type \'help\' for available commands"\n');
      terminalProcess.stdin.write('pwd\n');
      if (fs.existsSync(path.join(sessionDir, '.git'))) {
        terminalProcess.stdin.write('git status\n');
      }
    }, 500);

    return terminalProcess;
  }

  async executeCommand(sessionId, data, ws) {
    try {
      const session = this.activeSessions.get(sessionId);
      
      if (!session) {
        throw new Error('Terminal session not found');
      }

      // Handle different types of input
      if (typeof data === 'string') {
        // Direct command input
        session.process.stdin.write(data);
      } else if (data.type === 'input') {
        // Character-by-character input for real-time interaction
        session.process.stdin.write(data.data);
      } else if (data.type === 'signal') {
        // Handle Ctrl+C, Ctrl+Z etc
        if (data.signal === 'SIGINT') {
          session.process.kill('SIGINT');
        } else if (data.signal === 'SIGTERM') {
          session.process.kill('SIGTERM');
        }
      }

      // Log command execution (only log actual commands, not individual characters)
      if (typeof data === 'string' && data.includes('\n')) {
        console.log(`Command executed in session ${sessionId}: ${data.trim()}`);
      }

    } catch (error) {
      console.error('Execute command error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: error.message
      }));
    }
  }

  async resizeTerminal(sessionId, { cols, rows }, ws) {
    try {
      const session = this.activeSessions.get(sessionId);
      
      if (!session) {
        throw new Error('Terminal session not found');
      }

      // Resize terminal (if supported by the process)
      if (session.process.resize) {
        session.process.resize(cols, rows);
      }

    } catch (error) {
      console.error('Resize terminal error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: error.message
      }));
    }
  }

  async stopTerminalSession(sessionId, ws) {
    try {
      this.cleanup(sessionId);
      
      ws.send(JSON.stringify({
        type: 'terminal_stopped',
        message: 'Terminal session stopped'
      }));

    } catch (error) {
      console.error('Stop terminal session error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: error.message
      }));
    }
  }

  cleanup(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      try {
        session.process.kill('SIGTERM');
      } catch (error) {
        console.error('Error killing process:', error);
      }
      
      this.activeSessions.delete(sessionId);
    }

    this.wsConnections.delete(sessionId);
  }

  // REST API endpoints
  async getActiveTerminals(req, res) {
    try {
      const sessions = Array.from(this.activeSessions.entries()).map(([id, session]) => ({
        sessionId: id,
        vmId: session.vmId,
        projectId: session.projectId,
        startTime: session.startTime,
        userId: session.userId
      }));

      res.json({
        count: sessions.length,
        sessions
      });

    } catch (error) {
      console.error('Get active terminals error:', error);
      res.status(500).json({
        error: 'Failed to get active terminals',
        details: error.message
      });
    }
  }

  async terminateSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      this.cleanup(sessionId);
      
      res.json({
        message: 'Terminal session terminated successfully'
      });

    } catch (error) {
      console.error('Terminate session error:', error);
      res.status(500).json({
        error: 'Failed to terminate session',
        details: error.message
      });
    }
  }
}

module.exports = new TerminalController();
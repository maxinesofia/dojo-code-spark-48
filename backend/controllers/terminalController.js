const { spawn } = require('child_process');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const os = require('os');

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
      console.log(`🚀 Starting terminal session ${sessionId} with data:`, data);
      
      // For now, create a simple session without requiring project/database
      // This can be enhanced later to integrate with actual projects
      const vmId = sessionId; // Use session ID as VM ID for simplicity
      
      // Connect to terminal
      const terminalProcess = await this.connectToVMTerminal(vmId);
      
      this.activeSessions.set(sessionId, {
        vmId,
        projectId: data?.projectId || 'default',
        userId: data?.userId || 'default-user',
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
        console.log(`🔚 Terminal process for session ${sessionId} closed with code ${code}`);
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
      console.error('❌ Start terminal session error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: error.message
      }));
    }
  }

  async connectToVMTerminal(vmId) {
    // Create a working directory for this session in the project root
    const projectRoot = process.cwd();
    const sessionDir = path.join(projectRoot, 'workspace', vmId);
    
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
      
      // Initialize as git repository
      try {
        const { execSync } = require('child_process');
        execSync('git init', { cwd: sessionDir });
        execSync('git config user.name "Developer"', { cwd: sessionDir });
        execSync('git config user.email "dev@tutorials-dojo.com"', { cwd: sessionDir });
        
        // Create a basic README
        fs.writeFileSync(path.join(sessionDir, 'README.md'), '# Tutorials Dojo Project\n\nWelcome to your project workspace!\n');
        console.log(`✅ Git repository initialized in ${sessionDir}`);
      } catch (error) {
        console.log('⚠️ Git not available, skipping repository initialization');
      }
    }

    // Determine the best shell for the platform
    let shell, shellArgs;
    if (process.platform === 'win32') {
      // Try Git Bash first, then PowerShell, then cmd
      const gitBashPaths = [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        process.env.PROGRAMFILES + '\\Git\\bin\\bash.exe'
      ];
      
      const gitBash = gitBashPaths.find(p => fs.existsSync(p));
      if (gitBash) {
        shell = gitBash;
        shellArgs = ['--login', '-i'];
      } else {
        shell = 'powershell.exe';
        shellArgs = ['-NoExit', '-Command', '-'];
      }
    } else {
      shell = '/bin/bash';
      shellArgs = ['-i']; // Interactive mode
    }
    
    console.log(`🐚 Starting shell: ${shell} with args: ${shellArgs.join(' ')}`);
    
    const terminalProcess = spawn(shell, shellArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: sessionDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        PS1: '\\[\\033[32m\\]tutorials-dojo\\[\\033[0m\\]:\\[\\033[34m\\]\\w\\[\\033[0m\\]$ ',
        HOME: sessionDir,
        PWD: sessionDir,
        SHELL: shell,
        TERM_PROGRAM: 'tutorials-dojo-terminal',
        FORCE_COLOR: '1'
      }
    });

    // Handle process errors
    terminalProcess.on('error', (error) => {
      console.error('❌ Terminal process error:', error);
    });

    terminalProcess.on('close', (code, signal) => {
      console.log(`🔚 Terminal process closed with code ${code}, signal ${signal}`);
    });

    // Send initial setup commands
    setTimeout(() => {
      if (process.platform !== 'win32') {
        terminalProcess.stdin.write('clear\n');
      }
      terminalProcess.stdin.write('echo "🚀 Welcome to Tutorials Dojo Terminal"\n');
      terminalProcess.stdin.write('echo "📁 Current directory: $(pwd)"\n');
      terminalProcess.stdin.write('pwd\n');
      
      if (fs.existsSync(path.join(sessionDir, '.git'))) {
        terminalProcess.stdin.write('git --version 2>/dev/null && echo "✅ Git is available" || echo "❌ Git not found"\n');
        terminalProcess.stdin.write('git status 2>/dev/null || echo "📝 Initialize git with: git add . && git commit -m \'Initial commit\'"\n');
      }
      
      terminalProcess.stdin.write('which node 2>/dev/null && echo "✅ Node.js: $(node --version)" || echo "❌ Node.js not found"\n');
      terminalProcess.stdin.write('which npm 2>/dev/null && echo "✅ npm: $(npm --version)" || echo "❌ npm not found"\n');
    }, 1000);

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
        // Direct command input - write exactly as received
        session.process.stdin.write(data);
        console.log(`📝 Command input in session ${sessionId}: ${data.replace(/\r?\n/g, '\\n')}`);
      } else if (data && data.type === 'input') {
        // Character-by-character input for real-time interaction
        const input = data.data;
        session.process.stdin.write(input);
        
        // Log only complete commands (when enter is pressed)
        if (input === '\r' || input === '\n') {
          console.log(`⏎ Command executed in session ${sessionId}`);
        }
      } else if (data && data.type === 'signal') {
        // Handle Ctrl+C, Ctrl+Z etc
        console.log(`🔔 Signal sent to session ${sessionId}: ${data.signal}`);
        if (data.signal === 'SIGINT') {
          session.process.kill('SIGINT');
        } else if (data.signal === 'SIGTERM') {
          session.process.kill('SIGTERM');
        }
      }

    } catch (error) {
      console.error('❌ Execute command error:', error);
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
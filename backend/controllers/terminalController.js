const { spawn } = require('child_process');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class TerminalController {
  constructor() {
    this.activeSessions = new Map();
    this.wsConnections = new Map();
    this.workspaceDir = path.join(__dirname, '../../workspaces');
    this.initializeWorkspaceDir();
  }

  async initializeWorkspaceDir() {
    try {
      await fs.mkdir(this.workspaceDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create workspace directory:', error);
    }
  }

  // Initialize WebSocket server for terminal sessions
  initializeWebSocketServer(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/terminal' 
    });

    this.wss.on('connection', (ws, req) => {
      const sessionId = uuidv4();
      console.log(`🔌 New terminal session: ${sessionId}`);
      
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
        console.log(`🔌 Terminal session closed: ${sessionId}`);
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

    console.log('✅ Terminal WebSocket server listening on /terminal');
  }

  async handleWebSocketMessage(sessionId, message, ws) {
    const { type, data } = message;

    try {
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
    } catch (error) {
      console.error(`Error handling message type ${type}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        data: error.message
      }));
    }
  }

  async startTerminalSession(sessionId, data, ws) {
  try {
      const { projectId, userId } = data || { projectId: 'default', userId: 'user' };

      // Create project workspace
      const workspacePath = path.join(this.workspaceDir, `${projectId}_${sessionId}`);
      await fs.mkdir(workspacePath, { recursive: true });

      // Initialize workspace with basic structure
      await this.setupWorkspace(workspacePath);

  // Create terminal process (PTY if available)
  const terminalProcess = await this.createTerminalProcess(workspacePath, sessionId);
      
      this.activeSessions.set(sessionId, {
        projectId,
        userId,
        process: terminalProcess,
        workspacePath,
        startTime: new Date()
      });

      // Setup process handlers
      if (terminalProcess.isPty) {
        terminalProcess.process.onData(data => {
          try {
            ws.send(JSON.stringify({ type: 'output', data }));
          } catch (e) {
            console.error('Error sending PTY data:', e);
          }
        });
      } else {
        terminalProcess.process.stdout.on('data', (data) => {
          try {
            ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
          } catch (error) {
            console.error('Error sending stdout:', error);
          }
        });
        terminalProcess.process.stderr.on('data', (data) => {
          try {
            ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
          } catch (error) {
            console.error('Error sending stderr:', error);
          }
        });
      }

      terminalProcess.process.on('close', (code) => {
        try {
          ws.send(JSON.stringify({
            type: 'process_exit',
            code
          }));
        } catch (error) {
          console.error('Error sending close event:', error);
        }
        this.cleanup(sessionId);
      });

      terminalProcess.process.on('error', (error) => {
        console.error(`Terminal process error for session ${sessionId}:`, error);
        try {
          ws.send(JSON.stringify({
            type: 'error',
            data: error.message
          }));
        } catch (wsError) {
          console.error('Error sending error event:', wsError);
        }
      });

      ws.send(JSON.stringify({
        type: 'terminal_started',
        sessionId,
        workspacePath,
        message: 'Terminal session started successfully'
      }));

      // Send capability info (PTY or not)
      ws.send(JSON.stringify({
        type: 'terminal_capabilities',
        data: { pty: terminalProcess.isPty }
      }));

    } catch (error) {
      console.error('Start terminal session error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: error.message
      }));
    }
  }

  async setupWorkspace(workspacePath) {
    try {
      // Create basic project structure
      await fs.mkdir(path.join(workspacePath, 'src'), { recursive: true });
      await fs.mkdir(path.join(workspacePath, 'dist'), { recursive: true });
      await fs.mkdir(path.join(workspacePath, 'node_modules'), { recursive: true });

      // Create package.json
      const packageJson = {
        name: 'sandbox-project',
        version: '1.0.0',
        description: 'Code Sandbox Project',
        main: 'src/index.js',
        scripts: {
          start: 'node src/index.js',
          dev: 'node src/index.js',
          build: 'echo "Build completed"',
          test: 'echo "Test completed"'
        },
        dependencies: {},
        devDependencies: {}
      };

      await fs.writeFile(
        path.join(workspacePath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create sample files
      await fs.writeFile(
        path.join(workspacePath, 'src', 'index.js'),
        '// Welcome to your code sandbox!\nconsole.log("Hello, World!");\n'
      );

      await fs.writeFile(
        path.join(workspacePath, 'README.md'),
        '# Code Sandbox Project\n\nThis is your sandbox environment. Start coding!\n'
      );

    } catch (error) {
      console.error('Error setting up workspace:', error);
      throw error;
    }
  }

  async createTerminalProcess(workspacePath, sessionId) {
    const isWindows = os.platform() === 'win32';
    const { createPty, hasPtySupport } = require('../services/ptyManager');

    let shell = isWindows ? 'powershell.exe' : '/bin/bash';
    const shellArgs = isWindows ? ['-NoProfile', '-NoLogo'] : ['--login'];

    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      PWD: workspacePath,
      HOME: workspacePath,
      SHELL: shell,
      LANG: 'en_US.UTF-8',
      PS1: isWindows ? undefined : `\\[\\033[32m\\]sandbox@${sessionId.slice(0,8)}\\[\\033[0m\\]:\\[\\033[34m\\]\\w\\[\\033[0m\\]$ `,
      NODE_ENV: 'development'
    };

    if (hasPtySupport()) {
      const ptyProcess = createPty(shell, shellArgs, { cwd: workspacePath, env, cols: 80, rows: 24 });
      if (ptyProcess) {
        // Write welcome message via PTY
        setTimeout(() => {
          ptyProcess.write(isWindows ? 'Write-Host "PTY Terminal Ready"\r' : 'echo -e "\\e[32mPTY Terminal Ready\\e[0m"\r');
        }, 50);
        return { process: ptyProcess, isPty: true };
      }
    }

    // Fallback spawn (non-PTY) - limited interactive support
    const child = spawn(shell, shellArgs, {
      cwd: workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
      detached: false
    });
    setTimeout(() => {
      if (isWindows) {
        child.stdin.write(`Set-Location "${workspacePath}"\n`);
        child.stdin.write('Write-Host "Fallback Terminal Ready"\n');
      } else {
        child.stdin.write('echo -e "\\e[33mFallback Terminal (no PTY)\\e[0m"\n');
      }
    }, 50);
    return { process: child, isPty: false };
  }

  async executeCommand(sessionId, command, ws) {
    try {
      const session = this.activeSessions.get(sessionId);
      
      if (!session) {
        throw new Error('Terminal session not found');
      }

      // Send command to terminal process
      if (session.process.isPty) {
        session.process.process.write(command); // PTY raw input
      } else {
        session.process.process.stdin.write(command.endsWith('\n') ? command : command + '\n');
      }

      // Log command execution
      console.log(`💻 Command executed in session ${sessionId}: ${command.trim()}`);

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

      // Resize terminal if supported
      const wrapper = session.process;
      // PTY case
      if (wrapper.process && typeof wrapper.process.resize === 'function') {
        try { wrapper.process.resize(cols, rows); } catch (e) { /* ignore */ }
      } else if (typeof wrapper.resize === 'function') {
        try { wrapper.resize(cols, rows); } catch (e) { /* ignore */ }
      }

      console.log(`📐 Terminal resized for session ${sessionId}: ${cols}x${rows}`);

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

      console.log(`🛑 Terminal session stopped: ${sessionId}`);

    } catch (error) {
      console.error('Stop terminal session error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: error.message
      }));
    }
  }

  async cleanup(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      try {
        // Kill the process
        const procWrapper = session.process;
        const proc = procWrapper.process || procWrapper; // compatibility
        if (proc && !proc.killed) {
            try { proc.kill('SIGTERM'); } catch (_) {}
          
          // Force kill after timeout
          setTimeout(() => {
              if (proc && !proc.killed) {
                try { proc.kill('SIGKILL'); } catch (_) {}
            }
          }, 5000);
        }

        // Clean up workspace (optional - you might want to keep it for persistence)
        // await fs.rmdir(session.workspacePath, { recursive: true });
        
      } catch (error) {
        console.error(`Error cleaning up session ${sessionId}:`, error);
      }
      
      this.activeSessions.delete(sessionId);
    }

    this.wsConnections.delete(sessionId);
    console.log(`🧹 Cleaned up session: ${sessionId}`);
  }

  // REST API endpoints
  async getActiveTerminals(req, res) {
    try {
      const sessions = Array.from(this.activeSessions.entries()).map(([id, session]) => ({
        sessionId: id,
        projectId: session.projectId,
        startTime: session.startTime,
        userId: session.userId,
        workspacePath: session.workspacePath,
        isAlive: !session.process.killed
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
      
      if (!this.activeSessions.has(sessionId)) {
        return res.status(404).json({
          error: 'Terminal session not found'
        });
      }

      await this.cleanup(sessionId);
      
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
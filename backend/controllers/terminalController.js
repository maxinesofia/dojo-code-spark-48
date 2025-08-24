const { spawn } = require('child_process');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const { Project, File } = require('../models');

class TerminalController {
  constructor() {
    this.activeSessions = new Map();
    this.wsConnections = new Map();
    this.workspaceDir = path.join(process.cwd(), 'workspace');
    this.ensureWorkspaceDir();
  }

  async ensureWorkspaceDir() {
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
        message: 'Git Bash Terminal Ready - Type commands to interact!' 
      }));
    });
  }

  async handleWebSocketMessage(sessionId, message, ws) {
    const { type, data } = message;

    switch (type) {
      case 'start_terminal':
        await this.startTerminalSession(sessionId, data, ws);
        break;
      
      case 'input':
        await this.sendInput(sessionId, data, ws);
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
      const { projectId = 'default', userId = 'default' } = data || {};

      // Create isolated workspace for this session
      const sessionWorkspace = path.join(this.workspaceDir, sessionId);
      await fs.mkdir(sessionWorkspace, { recursive: true });

      // Create a shell process (cross-platform)
      const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
      const shellArgs = process.platform === 'win32' ? [] : [];
      
      const shellProcess = spawn(shell, shellArgs, {
        cwd: sessionWorkspace,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          PS1: process.platform === 'win32' ? undefined : '\\[\\033[32m\\]git-bash\\[\\033[0m\\]:\\[\\033[34m\\]\\w\\[\\033[0m\\]$ ',
          HOME: sessionWorkspace,
          USER: 'developer'
        }
      });

      this.activeSessions.set(sessionId, {
        projectId,
        userId,
        process: shellProcess,
        workspace: sessionWorkspace,
        startTime: new Date(),
        cols: 80,
        rows: 24
      });

      // Handle process output
      shellProcess.stdout.on('data', (data) => {
        ws.send(JSON.stringify({
          type: 'output',
          data: data.toString()
        }));
      });

      shellProcess.stderr.on('data', (data) => {
        ws.send(JSON.stringify({
          type: 'output',
          data: data.toString()
        }));
      });

      // Handle process exit
      shellProcess.on('close', (exitCode) => {
        console.log(`Shell process exited: ${exitCode}`);
        ws.send(JSON.stringify({
          type: 'process_exit',
          exitCode
        }));
        this.cleanup(sessionId);
      });

      shellProcess.on('error', (error) => {
        console.error('Shell process error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: error.message
        }));
      });

      // Send welcome message
      setTimeout(() => {
        const welcomeMsg = '\x1b[32mWelcome to Git Bash Terminal!\x1b[0m\r\n';
        ws.send(JSON.stringify({
          type: 'output',
          data: welcomeMsg
        }));
      }, 100);

      ws.send(JSON.stringify({
        type: 'terminal_started',
        sessionId,
        workspace: sessionWorkspace,
        message: 'Terminal session started with Git support!'
      }));

    } catch (error) {
      console.error('Start terminal session error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: error.message
      }));
    }
  }

  async sendInput(sessionId, input, ws) {
    try {
      const session = this.activeSessions.get(sessionId);
      
      if (!session) {
        throw new Error('Terminal session not found');
      }

      // Send input to shell process
      session.process.stdin.write(input);

    } catch (error) {
      console.error('Send input error:', error);
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

      // Store terminal size (child_process doesn't support resize directly)
      session.cols = cols;
      session.rows = rows;

      console.log(`Terminal size updated for session ${sessionId}: ${cols}x${rows}`);

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
        // Kill shell process
        session.process.kill('SIGTERM');
      } catch (error) {
        console.error('Error killing shell process:', error);
      }
      
      // Clean up workspace directory (optional - could keep for persistence)
      if (session.workspace) {
        fs.rmdir(session.workspace, { recursive: true }).catch(err => {
          console.error('Error cleaning workspace:', err);
        });
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
        projectId: session.projectId,
        startTime: session.startTime,
        userId: session.userId,
        workspace: session.workspace,
        size: `${session.cols}x${session.rows}`
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
const pty = require('node-pty');
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

      // Initialize git repository in the workspace
      const ptyProcess = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: sessionWorkspace,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          PS1: process.platform === 'win32' ? undefined : '\\[\\033[32m\\]git-bash\\[\\033[0m\\]:\\[\\033[34m\\]\\w\\[\\033[0m\\]$ ',
          HOME: sessionWorkspace,
          USER: 'developer',
          SHELL: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
        }
      });

      this.activeSessions.set(sessionId, {
        projectId,
        userId,
        process: ptyProcess,
        workspace: sessionWorkspace,
        startTime: new Date(),
        cols: 80,
        rows: 24
      });

      // Handle PTY data (stdout/stderr combined)
      ptyProcess.onData((data) => {
        ws.send(JSON.stringify({
          type: 'output',
          data: data
        }));
      });

      // Handle PTY exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`Terminal process exited: ${exitCode}, signal: ${signal}`);
        ws.send(JSON.stringify({
          type: 'process_exit',
          exitCode,
          signal
        }));
        this.cleanup(sessionId);
      });

      // Initialize with welcome message and git setup
      setTimeout(() => {
        const welcomeCmd = process.platform === 'win32' 
          ? 'echo Welcome to Git Bash Terminal! & git --version & echo. & echo Ready for Git operations...\r\n'
          : 'echo "Welcome to Git Bash Terminal!" && git --version && echo "Ready for Git operations..."\n';
        
        ptyProcess.write(welcomeCmd);
      }, 100);

      ws.send(JSON.stringify({
        type: 'terminal_started',
        sessionId,
        workspace: sessionWorkspace,
        message: 'Real terminal session started with Git support!'
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

      // Send input directly to PTY
      session.process.write(input);

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

      // Resize PTY
      session.process.resize(cols, rows);
      session.cols = cols;
      session.rows = rows;

      console.log(`Terminal resized for session ${sessionId}: ${cols}x${rows}`);

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
        // Kill PTY process
        session.process.kill();
      } catch (error) {
        console.error('Error killing PTY process:', error);
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
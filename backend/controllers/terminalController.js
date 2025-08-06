const { spawn } = require('child_process');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
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
    // Connect to the Firecracker VM terminal
    // This would use the VM's console or SSH connection
    
    // For now, simulate with a local bash process (replace with actual VM connection)
    const terminalProcess = spawn('bash', [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        PS1: `\\[\\033[32m\\]developer@firecracker-${vmId.slice(0,8)}\\[\\033[0m\\]:\\[\\033[34m\\]\\w\\[\\033[0m\\]$ `
      }
    });

    return terminalProcess;
  }

  async executeCommand(sessionId, command, ws) {
    try {
      const session = this.activeSessions.get(sessionId);
      
      if (!session) {
        throw new Error('Terminal session not found');
      }

      // Send command to terminal process
      session.process.stdin.write(command + '\n');

      // Log command execution
      console.log(`Command executed in session ${sessionId}: ${command}`);

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
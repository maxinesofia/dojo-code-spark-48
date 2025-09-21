const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class DockerService {
  constructor() {
    this.containerPrefix = 'tutorials-dojo-sandbox';
    this.workspaceDir = process.env.WORKSPACE_DIR || '/tmp/sandboxes';
    this.initializeWorkspace();
  }

  async initializeWorkspace() {
    try {
      await fs.mkdir(this.workspaceDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create workspace directory:', error);
    }
  }

  async createSandbox(projectId, files) {
    const sandboxId = uuidv4();
    const sandboxPath = path.join(this.workspaceDir, sandboxId);
    
    try {
      // Create sandbox directory
      await fs.mkdir(sandboxPath, { recursive: true });
      
      // Write all project files
      await this.writeProjectFiles(sandboxPath, files);
      
      // Create Dockerfile based on project type
      const dockerfile = this.generateDockerfile(files);
      await fs.writeFile(path.join(sandboxPath, 'Dockerfile'), dockerfile);
      
      // Build and run container
      const containerName = `${this.containerPrefix}-${sandboxId}`;
      
      await this.buildContainer(sandboxPath, containerName);
      const port = await this.runContainer(containerName, sandboxId);
      
      return {
        sandboxId,
        containerName,
        port,
        url: `http://localhost:${port}`
      };
    } catch (error) {
      console.error('Failed to create sandbox:', error);
      throw new Error('Sandbox creation failed');
    }
  }

  async writeProjectFiles(basePath, files) {
    for (const file of files) {
      const filePath = path.join(basePath, file.path);
      const fileDir = path.dirname(filePath);
      
      // Create directory if it doesn't exist
      await fs.mkdir(fileDir, { recursive: true });
      
      // Write file content
      await fs.writeFile(filePath, file.content, 'utf8');
    }
  }

  generateDockerfile(files) {
    // Detect project type
    const hasPackageJson = files.some(f => f.name === 'package.json');
    const hasIndexHtml = files.some(f => f.name === 'index.html');
    const hasReactFiles = files.some(f => f.content.includes('import React'));
    
    if (hasPackageJson && hasReactFiles) {
      return this.getReactDockerfile();
    } else if (hasPackageJson) {
      return this.getNodeDockerfile();
    } else if (hasIndexHtml) {
      return this.getStaticDockerfile();
    } else {
      return this.getDefaultDockerfile();
    }
  }

  getReactDockerfile() {
    return `
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
`;
  }

  getNodeDockerfile() {
    return `
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`;
  }

  getStaticDockerfile() {
    return `
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
  }

  getDefaultDockerfile() {
    return `
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install -g http-server
EXPOSE 8080
CMD ["http-server", "-p", "8080"]
`;
  }

  async buildContainer(sandboxPath, containerName) {
    return new Promise((resolve, reject) => {
      const buildCommand = `docker build -t ${containerName} ${sandboxPath}`;
      
      exec(buildCommand, (error, stdout, stderr) => {
        if (error) {
          console.error('Docker build error:', error);
          reject(error);
        } else {
          console.log('Docker build success:', stdout);
          resolve(stdout);
        }
      });
    });
  }

  async runContainer(containerName, sandboxId) {
    const port = this.getRandomPort();
    
    return new Promise((resolve, reject) => {
      const runCommand = `docker run -d --name ${containerName}-${sandboxId} -p ${port}:3000 ${containerName}`;
      
      exec(runCommand, (error, stdout, stderr) => {
        if (error) {
          console.error('Docker run error:', error);
          reject(error);
        } else {
          console.log('Container started:', stdout);
          resolve(port);
        }
      });
    });
  }

  async stopSandbox(sandboxId) {
    const containerName = `${this.containerPrefix}-${sandboxId}`;
    
    try {
      // Stop container
      await this.execCommand(`docker stop ${containerName}-${sandboxId}`);
      // Remove container
      await this.execCommand(`docker rm ${containerName}-${sandboxId}`);
      // Remove image
      await this.execCommand(`docker rmi ${containerName}`);
      
      // Clean up sandbox directory
      const sandboxPath = path.join(this.workspaceDir, sandboxId);
      await fs.rmdir(sandboxPath, { recursive: true });
      
      return true;
    } catch (error) {
      console.error('Failed to stop sandbox:', error);
      throw error;
    }
  }

  async updateSandboxFiles(sandboxId, files) {
    const sandboxPath = path.join(this.workspaceDir, sandboxId);
    
    try {
      // Update files in sandbox directory
      await this.writeProjectFiles(sandboxPath, files);
      
      // Restart container with updated files
      const containerName = `${this.containerPrefix}-${sandboxId}`;
      await this.execCommand(`docker restart ${containerName}-${sandboxId}`);
      
      return true;
    } catch (error) {
      console.error('Failed to update sandbox files:', error);
      throw error;
    }
  }

  getRandomPort() {
    return Math.floor(Math.random() * (9000 - 3001) + 3001);
  }

  execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async executeCode(executionId, files, language = 'javascript', timeout = 30000) {
    const sandboxPath = path.join(this.workspaceDir, executionId);
    
    try {
      // Create temporary directory
      await fs.mkdir(sandboxPath, { recursive: true });
      
      // Write files to directory
      await this.writeProjectFiles(sandboxPath, files);
      
      // Execute based on language
      const result = await this.runCodeExecution(sandboxPath, files, language, timeout);
      
      // Clean up
      await fs.rmdir(sandboxPath, { recursive: true });
      
      return result;
    } catch (error) {
      console.error('Code execution error:', error);
      throw error;
    }
  }

  async runCodeExecution(sandboxPath, files, language, timeout) {
    const startTime = Date.now();
    
    try {
      let command;
      let entryFile = this.detectEntryFile(files, language);
      
      switch (language.toLowerCase()) {
        case 'python':
        case 'py':
          command = `cd ${sandboxPath} && timeout ${Math.floor(timeout/1000)} python ${entryFile}`;
          break;
        case 'node':
        case 'nodejs':
        case 'javascript':
          command = `cd ${sandboxPath} && timeout ${Math.floor(timeout/1000)} node ${entryFile}`;
          break;
        case 'java':
          const className = entryFile.replace('.java', '');
          command = `cd ${sandboxPath} && javac ${entryFile} && timeout ${Math.floor(timeout/1000)} java ${className}`;
          break;
        case 'c':
          const execName = entryFile.replace('.c', '');
          command = `cd ${sandboxPath} && gcc ${entryFile} -o ${execName} && timeout ${Math.floor(timeout/1000)} ./${execName}`;
          break;
        case 'cpp':
        case 'c++':
          const cppExecName = entryFile.replace(/\.(cpp|cc)/, '');
          command = `cd ${sandboxPath} && g++ ${entryFile} -o ${cppExecName} && timeout ${Math.floor(timeout/1000)} ./${cppExecName}`;
          break;
        case 'go':
          command = `cd ${sandboxPath} && timeout ${Math.floor(timeout/1000)} go run ${entryFile}`;
          break;
        case 'rust':
          const rustExecName = entryFile.replace('.rs', '');
          command = `cd ${sandboxPath} && rustc ${entryFile} -o ${rustExecName} && timeout ${Math.floor(timeout/1000)} ./${rustExecName}`;
          break;
        case 'bash':
        case 'shell':
          command = `cd ${sandboxPath} && timeout ${Math.floor(timeout/1000)} bash ${entryFile}`;
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }
      
      const result = await this.execCommand(command);
      const executionTime = Date.now() - startTime;
      
      return {
        stdout: result,
        stderr: '',
        executionTime,
        logs: []
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        stdout: '',
        stderr: error.message || 'Execution failed',
        executionTime,
        logs: []
      };
    }
  }

  detectEntryFile(files, language) {
    // Common entry file patterns
    const entryPatterns = {
      python: ['main.py', 'app.py', 'index.py'],
      java: ['Main.java', 'App.java'],
      javascript: ['index.js', 'main.js', 'app.js'],
      c: ['main.c', 'app.c'],
      cpp: ['main.cpp', 'app.cpp', 'main.cc'],
      go: ['main.go', 'app.go'],
      rust: ['main.rs', 'app.rs'],
      bash: ['main.sh', 'app.sh', 'script.sh']
    };
    
    const langKey = language.toLowerCase();
    const patterns = entryPatterns[langKey] || entryPatterns[langKey.replace(/\+\+/, 'pp')];
    
    if (patterns) {
      for (const pattern of patterns) {
        const file = files.find(f => f.name === pattern);
        if (file) return pattern;
      }
    }
    
    // Fallback: find first file with matching extension
    const extensions = {
      python: ['.py'],
      java: ['.java'],
      javascript: ['.js'],
      c: ['.c'],
      cpp: ['.cpp', '.cc'],
      go: ['.go'],
      rust: ['.rs'],
      bash: ['.sh']
    };
    
    const exts = extensions[langKey] || extensions[langKey.replace(/\+\+/, 'pp')];
    if (exts) {
      for (const ext of exts) {
        const file = files.find(f => f.name.endsWith(ext));
        if (file) return file.name;
      }
    }
    
    // Last resort: return first file
    return files[0]?.name || 'main.js';
  }

  async listActiveSandboxes() {
    try {
      const stdout = await this.execCommand(`docker ps --filter name=${this.containerPrefix} --format "table {{.Names}}\\t{{.Ports}}\\t{{.Status}}"`);
      return stdout;
    } catch (error) {
      console.error('Failed to list active sandboxes:', error);
      return '';
    }
  }
}

module.exports = new DockerService();
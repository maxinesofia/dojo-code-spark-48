// Enhanced Firecracker Service with Official Setup Integration
// This service integrates with the official Firecracker setup for secure code execution

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FirecrackerService {
    constructor() {
        this.firecrackerPath = '/opt/firecracker';
        this.startScript = path.join(this.firecrackerPath, 'start-firecracker.sh');
        this.stopScript = path.join(this.firecrackerPath, 'stop-firecracker.sh');
        this.activeVMs = new Map();
        this.vmTimeout = 30000; // 30 seconds timeout
        this.maxConcurrentVMs = 5;
    }

    /**
     * Execute code in a Firecracker microVM
     * @param {Object} files - Files to execute
     * @param {string} language - Programming language
     * @param {number} timeoutMs - Execution timeout in milliseconds
     * @returns {Object} Execution result
     */
    async executeCode(files, language, timeoutMs = 30000) {
        const vmId = this.generateVMId();
        
        try {
            // Check if we're at VM limit
            if (this.activeVMs.size >= this.maxConcurrentVMs) {
                throw new Error('Maximum number of concurrent VMs reached');
            }

            // Generate execution script based on language
            const executionScript = this.generateExecutionScript(files, language);
            
            // Start Firecracker VM with execution script
            const vmInfo = await this.startFirecrackerVM(vmId, executionScript);
            
            // Execute code and get result
            const result = await this.executeInVM(vmInfo, timeoutMs);
            
            // Cleanup VM
            await this.stopFirecrackerVM(vmId);
            
            return {
                success: true,
                output: result.stdout,
                error: result.stderr,
                executionTime: result.executionTime,
                vmId: vmId
            };

        } catch (error) {
            // Ensure VM is cleaned up on error
            await this.stopFirecrackerVM(vmId);
            
            return {
                success: false,
                output: '',
                error: error.message,
                executionTime: 0,
                vmId: vmId
            };
        }
    }

    /**
     * Generate unique VM ID
     * @returns {string} Unique VM identifier
     */
    generateVMId() {
        return `vm-${crypto.randomBytes(8).toString('hex')}-${Date.now()}`;
    }

    /**
     * Generate execution script based on language and files
     * @param {Object} files - Files to execute
     * @param {string} language - Programming language
     * @returns {string} Shell script for execution
     */
    generateExecutionScript(files, language) {
        let script = '#!/bin/bash\n';
        script += 'set -e\n';
        script += 'cd /tmp/workspace\n\n';

        // Create files
        for (const [filename, content] of Object.entries(files)) {
            const escapedContent = content.replace(/'/g, "'\"'\"'");
            script += `cat > '${filename}' << 'EOF'\n${escapedContent}\nEOF\n\n`;
        }

        // Add execution logic based on language
        switch (language.toLowerCase()) {
            case 'javascript':
            case 'js':
                script += this.getJavaScriptExecution(files);
                break;
            case 'python':
            case 'py':
                script += this.getPythonExecution(files);
                break;
            case 'typescript':
            case 'ts':
                script += this.getTypeScriptExecution(files);
                break;
            case 'bash':
            case 'shell':
                script += this.getBashExecution(files);
                break;
            case 'c':
                script += this.getCExecution(files);
                break;
            case 'cpp':
            case 'c++':
                script += this.getCppExecution(files);
                break;
            case 'nodejs':
            case 'node':
                script += this.getNodeJSExecution(files);
                break;
            case 'react':
            case 'tsx':
                script += this.getReactExecution(files);
                break;
            default:
                throw new Error(`Unsupported language: ${language}`);
        }

        return script;
    }

    /**
     * JavaScript execution logic
     */
    getJavaScriptExecution(files) {
        const mainFile = this.findMainFile(files, ['.js', 'main.js', 'index.js']);
        return `
echo "Executing JavaScript..."
timeout 30s node '${mainFile}' 2>&1
`;
    }

    /**
     * Python execution logic
     */
    getPythonExecution(files) {
        const mainFile = this.findMainFile(files, ['.py', 'main.py', 'app.py']);
        return `
echo "Executing Python..."
timeout 30s python3 '${mainFile}' 2>&1
`;
    }

    /**
     * TypeScript execution logic
     */
    getTypeScriptExecution(files) {
        const mainFile = this.findMainFile(files, ['.ts', 'main.ts', 'index.ts']);
        return `
echo "Executing TypeScript..."
timeout 30s npx ts-node '${mainFile}' 2>&1
`;
    }

    /**
     * Bash execution logic
     */
    getBashExecution(files) {
        const mainFile = this.findMainFile(files, ['.sh', 'main.sh', 'script.sh']);
        return `
echo "Executing Bash..."
chmod +x '${mainFile}'
timeout 30s bash '${mainFile}' 2>&1
`;
    }

    /**
     * C execution logic
     */
    getCExecution(files) {
        const mainFile = this.findMainFile(files, ['.c', 'main.c']);
        const execName = 'program';
        return `
echo "Compiling and executing C..."
gcc -o '${execName}' '${mainFile}' 2>&1
if [ $? -eq 0 ]; then
    timeout 30s ./'${execName}' 2>&1
else
    echo "Compilation failed"
    exit 1
fi
`;
    }

    /**
     * C++ execution logic
     */
    getCppExecution(files) {
        const mainFile = this.findMainFile(files, ['.cpp', '.cc', 'main.cpp']);
        const execName = 'program';
        return `
echo "Compiling and executing C++..."
g++ -o '${execName}' '${mainFile}' 2>&1
if [ $? -eq 0 ]; then
    timeout 30s ./'${execName}' 2>&1
else
    echo "Compilation failed"
    exit 1
fi
`;
    }

    /**
     * Node.js execution logic
     */
    getNodeJSExecution(files) {
        const mainFile = this.findMainFile(files, ['server.js', 'app.js', 'index.js', 'main.js']);
        return `
echo "Setting up Node.js environment..."
# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "Installing dependencies..."
    timeout 60s npm install 2>&1 || echo "Failed to install dependencies, continuing..."
fi

echo "Executing Node.js application..."
timeout 30s node '${mainFile}' 2>&1
`;
    }

    /**
     * React execution logic
     */
    getReactExecution(files) {
        const hasPackageJson = Object.keys(files).includes('package.json');
        return `
echo "Setting up React environment..."
# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "Installing dependencies..."
    timeout 120s npm install 2>&1 || echo "Failed to install dependencies, continuing..."
fi

# Check if this is a Vite project
if [ -f "vite.config.js" ] || [ -f "vite.config.ts" ]; then
    echo "Starting Vite development server..."
    timeout 60s npm run dev -- --host 0.0.0.0 --port 3000 2>&1 &
    sleep 5
    echo "React app should be running on http://localhost:3000"
elif [ -f "package.json" ] && grep -q "react-scripts" package.json; then
    echo "Starting Create React App development server..."
    timeout 60s npm start 2>&1 &
    sleep 5
    echo "React app should be running on http://localhost:3000"
else
    echo "No React build configuration found. Treating as Node.js..."
    ${this.getNodeJSExecution(files)}
fi
`;
    }

    /**
     * Find main file for execution
     */
    findMainFile(files, candidates) {
        const fileNames = Object.keys(files);
        
        // Try exact matches first
        for (const candidate of candidates) {
            if (fileNames.includes(candidate)) {
                return candidate;
            }
        }
        
        // Try extension matches
        for (const candidate of candidates) {
            if (candidate.startsWith('.')) {
                const match = fileNames.find(name => name.endsWith(candidate));
                if (match) return match;
            }
        }
        
        // Return first file if no match
        return fileNames[0];
    }

    /**
     * Start Firecracker VM with execution script
     * @param {string} vmId - VM identifier
     * @param {string} executionScript - Script to execute
     * @returns {Object} VM information
     */
    async startFirecrackerVM(vmId, executionScript) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            // Execute start script with VM ID and execution script
            const child = spawn('sudo', [this.startScript, 'start', vmId, executionScript], {
                cwd: this.firecrackerPath,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    // Parse VM info from output
                    const vmInfo = this.parseVMInfo(stdout, vmId, startTime);
                    this.activeVMs.set(vmId, vmInfo);
                    resolve(vmInfo);
                } else {
                    reject(new Error(`Failed to start Firecracker VM: ${stderr}`));
                }
            });

            // Timeout for VM startup
            setTimeout(() => {
                child.kill('SIGKILL');
                reject(new Error('VM startup timeout'));
            }, 60000); // 60 second timeout for startup
        });
    }

    /**
     * Parse VM information from startup output
     */
    parseVMInfo(output, vmId, startTime) {
        const info = { vmId, startTime };
        
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.startsWith('VM_ID:')) {
                info.vmId = line.split(':')[1];
            } else if (line.startsWith('VM_IP:')) {
                info.vmIP = line.split(':')[1];
            } else if (line.startsWith('FC_PID:')) {
                info.fcPid = parseInt(line.split(':')[1]);
            } else if (line.startsWith('LOG_FILE:')) {
                info.logFile = line.split(':')[1];
            }
        }
        
        return info;
    }

    /**
     * Execute script in running VM and get results
     */
    async executeInVM(vmInfo, timeoutMs) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            // Since the execution script is already running in the VM,
            // we need to wait for it to complete and get the results
            
            let checkInterval;
            let timeoutHandle;
            
            const checkExecution = async () => {
                try {
                    // Check if Firecracker process is still running
                    const isRunning = await this.isVMRunning(vmInfo.fcPid);
                    
                    if (!isRunning) {
                        // VM has stopped, get results from log
                        const result = await this.getExecutionResults(vmInfo);
                        clearInterval(checkInterval);
                        clearTimeout(timeoutHandle);
                        resolve({
                            ...result,
                            executionTime: Date.now() - startTime
                        });
                    }
                } catch (error) {
                    clearInterval(checkInterval);
                    clearTimeout(timeoutHandle);
                    reject(error);
                }
            };

            // Check every 500ms
            checkInterval = setInterval(checkExecution, 500);
            
            // Set timeout
            timeoutHandle = setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Execution timeout'));
            }, timeoutMs);
        });
    }

    /**
     * Check if VM process is running
     */
    async isVMRunning(pid) {
        return new Promise((resolve) => {
            exec(`ps -p ${pid}`, (error) => {
                resolve(!error);
            });
        });
    }

    /**
     * Get execution results from VM log file
     */
    async getExecutionResults(vmInfo) {
        try {
            const logContent = await fs.readFile(vmInfo.logFile, 'utf-8');
            
            // Parse log for execution output
            // This is a simplified parser - in practice, you'd need more sophisticated parsing
            const lines = logContent.split('\n');
            let stdout = '';
            let stderr = '';
            let inOutput = false;
            
            for (const line of lines) {
                if (line.includes('Executing')) {
                    inOutput = true;
                    continue;
                }
                
                if (inOutput) {
                    if (line.includes('ERROR') || line.includes('error')) {
                        stderr += line + '\n';
                    } else if (line.trim()) {
                        stdout += line + '\n';
                    }
                }
            }
            
            return { stdout: stdout.trim(), stderr: stderr.trim() };
        } catch (error) {
            throw new Error(`Failed to read execution results: ${error.message}`);
        }
    }

    /**
     * Stop Firecracker VM
     */
    async stopFirecrackerVM(vmId) {
        const vmInfo = this.activeVMs.get(vmId);
        if (!vmInfo) return;

        try {
            await new Promise((resolve, reject) => {
                const child = spawn('sudo', [this.stopScript], {
                    cwd: this.firecrackerPath
                });

                child.on('close', (code) => {
                    this.activeVMs.delete(vmId);
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Failed to stop VM: ${vmId}`));
                    }
                });

                // Force cleanup after timeout
                setTimeout(() => {
                    child.kill('SIGKILL');
                    this.activeVMs.delete(vmId);
                    resolve();
                }, 10000);
            });
        } catch (error) {
            console.error(`Error stopping VM ${vmId}:`, error);
            // Force cleanup
            this.activeVMs.delete(vmId);
        }
    }

    /**
     * Get active VMs
     */
    getActiveVMs() {
        return Array.from(this.activeVMs.values());
    }

    /**
     * Clean up all VMs
     */
    async cleanup() {
        const vmIds = Array.from(this.activeVMs.keys());
        await Promise.all(vmIds.map(vmId => this.stopFirecrackerVM(vmId)));
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            // Check if Firecracker binary exists
            await fs.access('/usr/local/bin/firecracker');
            
            // Check if required files exist
            await fs.access(this.startScript);
            await fs.access(this.stopScript);
            
            // Check if kernel and rootfs exist
            await fs.access(path.join(this.firecrackerPath, 'vmlinux-5.10'));
            await fs.access(path.join(this.firecrackerPath, 'ubuntu-24.04.ext4'));
            
            return {
                status: 'healthy',
                activeVMs: this.activeVMs.size,
                maxVMs: this.maxConcurrentVMs,
                firecrackerPath: this.firecrackerPath
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                activeVMs: this.activeVMs.size
            };
        }
    }
}

module.exports = FirecrackerService;

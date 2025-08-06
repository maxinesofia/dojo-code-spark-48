import { FileNode } from '../types/FileTypes';

export interface TerminalCommand {
  command: string;
  args: string[];
  timestamp: Date;
  output: string;
  exitCode: number;
}

export interface VirtualFileSystem {
  currentDirectory: string;
  files: Map<string, FileNode>;
  directories: Set<string>;
}

export class WebTerminalService {
  private history: TerminalCommand[] = [];
  private vfs: VirtualFileSystem;
  private environment: Map<string, string> = new Map();
  private aliases: Map<string, string> = new Map();

  constructor() {
    this.vfs = {
      currentDirectory: '/',
      files: new Map(),
      directories: new Set(['/'])
    };
    
    this.setupDefaultEnvironment();
    this.setupDefaultAliases();
  }

  private setupDefaultEnvironment(): void {
    this.environment.set('PWD', '/');
    this.environment.set('HOME', '/');
    this.environment.set('USER', 'developer');
    this.environment.set('SHELL', '/bin/bash');
    this.environment.set('TERM', 'xterm-256color');
    this.environment.set('PATH', '/bin:/usr/bin:/usr/local/bin:/node_modules/.bin');
  }

  private setupDefaultAliases(): void {
    this.aliases.set('ll', 'ls -la');
    this.aliases.set('la', 'ls -la');
    this.aliases.set('..', 'cd ..');
    this.aliases.set('...', 'cd ../..');
    this.aliases.set('cls', 'clear');
  }

  setupVirtualFS(files: FileNode[]): void {
    this.vfs.files.clear();
    this.vfs.directories.clear();
    this.vfs.directories.add('/');

    this.processFileNodes(files, '/');
  }

  private processFileNodes(nodes: FileNode[], currentPath: string): void {
    nodes.forEach(node => {
      const fullPath = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`;
      
      if (node.type === 'folder') {
        this.vfs.directories.add(fullPath);
        if (node.children) {
          this.processFileNodes(node.children, fullPath);
        }
      } else {
        this.vfs.files.set(fullPath, node);
        // Also add parent directories
        const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
        if (parentPath !== '/') {
          this.vfs.directories.add(parentPath);
        }
      }
    });
  }

  async executeCommand(command: string): Promise<string> {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return '';

    // Expand aliases
    const expandedCommand = this.expandAliases(trimmedCommand);
    
    // Parse command and arguments
    const parts = this.parseCommand(expandedCommand);
    const cmd = parts[0];
    const args = parts.slice(1);

    const terminalCommand: TerminalCommand = {
      command: trimmedCommand,
      args,
      timestamp: new Date(),
      output: '',
      exitCode: 0
    };

    try {
      switch (cmd) {
        case 'ls':
          terminalCommand.output = await this.handleLs(args);
          break;
        case 'cd':
          terminalCommand.output = await this.handleCd(args);
          break;
        case 'pwd':
          terminalCommand.output = this.vfs.currentDirectory;
          break;
        case 'mkdir':
          terminalCommand.output = await this.handleMkdir(args);
          break;
        case 'rm':
          terminalCommand.output = await this.handleRm(args);
          break;
        case 'cat':
          terminalCommand.output = await this.handleCat(args);
          break;
        case 'grep':
          terminalCommand.output = await this.handleGrep(args);
          break;
        case 'echo':
          terminalCommand.output = args.join(' ');
          break;
        case 'env':
          terminalCommand.output = this.handleEnv();
          break;
        case 'export':
          terminalCommand.output = this.handleExport(args);
          break;
        case 'history':
          terminalCommand.output = this.handleHistory();
          break;
        case 'clear':
          terminalCommand.output = '\x1b[2J\x1b[H';
          break;
        case 'npm':
          terminalCommand.output = await this.handleNpmCommands(args);
          break;
        case 'node':
          terminalCommand.output = await this.handleNodeCommand(args);
          break;
        case 'git':
          terminalCommand.output = await this.handleGitCommands(args);
          break;
        case 'code':
          terminalCommand.output = this.handleCodeCommand(args);
          break;
        case 'touch':
          terminalCommand.output = await this.handleTouch(args);
          break;
        case 'cp':
          terminalCommand.output = await this.handleCp(args);
          break;
        case 'mv':
          terminalCommand.output = await this.handleMv(args);
          break;
        case 'find':
          terminalCommand.output = await this.handleFind(args);
          break;
        case 'ps':
          terminalCommand.output = this.handlePs();
          break;
        case 'which':
          terminalCommand.output = this.handleWhich(args);
          break;
        case 'tree':
          terminalCommand.output = this.handleTree(args);
          break;
        case 'curl':
          terminalCommand.output = await this.handleCurl(args);
          break;
        case 'wget':
          terminalCommand.output = await this.handleWget(args);
          break;
        case 'help':
          terminalCommand.output = this.handleHelp();
          break;
        default:
          terminalCommand.output = `bash: ${cmd}: command not found`;
          terminalCommand.exitCode = 127;
      }
    } catch (error) {
      terminalCommand.output = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      terminalCommand.exitCode = 1;
    }

    this.history.push(terminalCommand);
    return terminalCommand.output;
  }

  private expandAliases(command: string): string {
    const parts = command.split(' ');
    const cmd = parts[0];
    
    if (this.aliases.has(cmd)) {
      const aliasValue = this.aliases.get(cmd)!;
      return aliasValue + ' ' + parts.slice(1).join(' ');
    }
    
    return command;
  }

  private parseCommand(command: string): string[] {
    // Simple command parsing (doesn't handle complex shell features)
    return command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  }

  private async handleLs(args: string[]): Promise<string> {
    let path = this.vfs.currentDirectory;
    let showHidden = false;
    let longFormat = false;
    let showAll = false;

    // Parse flags
    for (const arg of args) {
      if (arg.startsWith('-')) {
        if (arg.includes('a')) showAll = true;
        if (arg.includes('l')) longFormat = true;
        if (arg.includes('h')) showHidden = true;
      } else {
        path = this.resolvePath(arg);
      }
    }

    const items: string[] = [];
    
    // Add directories
    for (const dir of this.vfs.directories) {
      if (this.isInDirectory(dir, path) && dir !== path) {
        const name = dir.substring(path.length + (path === '/' ? 0 : 1));
        if (name && !name.includes('/')) {
          if (showAll || !name.startsWith('.')) {
            items.push(longFormat ? `drwxr-xr-x  2 developer developer  4096 ${new Date().toDateString()} ${name}/` : `${name}/`);
          }
        }
      }
    }

    // Add files
    for (const [filePath, file] of this.vfs.files) {
      if (this.isInDirectory(filePath, path)) {
        const name = filePath.substring(path.length + (path === '/' ? 0 : 1));
        if (name && !name.includes('/')) {
          if (showAll || !name.startsWith('.')) {
            if (longFormat) {
              const size = file.content?.length || 0;
              items.push(`-rw-r--r--  1 developer developer  ${size.toString().padStart(6)} ${new Date().toDateString()} ${name}`);
            } else {
              items.push(name);
            }
          }
        }
      }
    }

    return items.sort().join('\n');
  }

  private async handleCd(args: string[]): Promise<string> {
    const target = args[0] || this.environment.get('HOME') || '/';
    const newPath = this.resolvePath(target);

    if (this.vfs.directories.has(newPath)) {
      this.vfs.currentDirectory = newPath;
      this.environment.set('PWD', newPath);
      return '';
    } else {
      throw new Error(`cd: ${target}: No such file or directory`);
    }
  }

  private async handleMkdir(args: string[]): Promise<string> {
    if (args.length === 0) {
      throw new Error('mkdir: missing operand');
    }

    for (const arg of args) {
      const path = this.resolvePath(arg);
      this.vfs.directories.add(path);
    }

    return '';
  }

  private async handleRm(args: string[]): Promise<string> {
    if (args.length === 0) {
      throw new Error('rm: missing operand');
    }

    let recursive = false;
    const files: string[] = [];

    for (const arg of args) {
      if (arg === '-r' || arg === '-rf') {
        recursive = true;
      } else {
        files.push(arg);
      }
    }

    for (const file of files) {
      const path = this.resolvePath(file);
      
      if (this.vfs.files.has(path)) {
        this.vfs.files.delete(path);
      } else if (this.vfs.directories.has(path)) {
        if (recursive) {
          // Remove directory and all contents
          for (const [filePath] of this.vfs.files) {
            if (filePath.startsWith(path + '/')) {
              this.vfs.files.delete(filePath);
            }
          }
          for (const dir of Array.from(this.vfs.directories)) {
            if (dir.startsWith(path + '/') || dir === path) {
              this.vfs.directories.delete(dir);
            }
          }
        } else {
          throw new Error(`rm: ${file}: is a directory`);
        }
      } else {
        throw new Error(`rm: ${file}: No such file or directory`);
      }
    }

    return '';
  }

  private async handleCat(args: string[]): Promise<string> {
    if (args.length === 0) {
      throw new Error('cat: missing operand');
    }

    const outputs: string[] = [];
    
    for (const arg of args) {
      const path = this.resolvePath(arg);
      const file = this.vfs.files.get(path);
      
      if (file) {
        outputs.push(file.content || '');
      } else {
        throw new Error(`cat: ${arg}: No such file or directory`);
      }
    }

    return outputs.join('\n');
  }

  private async handleGrep(args: string[]): Promise<string> {
    if (args.length < 2) {
      throw new Error('grep: missing pattern or file');
    }

    const pattern = args[0];
    const file = args[1];
    const path = this.resolvePath(file);
    const fileNode = this.vfs.files.get(path);

    if (!fileNode) {
      throw new Error(`grep: ${file}: No such file or directory`);
    }

    const lines = (fileNode.content || '').split('\n');
    const matches = lines.filter(line => line.includes(pattern));
    
    return matches.join('\n');
  }

  private handleEnv(): string {
    const envVars: string[] = [];
    for (const [key, value] of this.environment) {
      envVars.push(`${key}=${value}`);
    }
    return envVars.sort().join('\n');
  }

  private handleExport(args: string[]): string {
    if (args.length === 0) {
      return this.handleEnv();
    }

    for (const arg of args) {
      const [key, value] = arg.split('=', 2);
      if (value !== undefined) {
        this.environment.set(key, value);
      }
    }

    return '';
  }

  private handleHistory(): string {
    return this.history
      .map((cmd, index) => `${index + 1}  ${cmd.command}`)
      .join('\n');
  }

  private async handleNpmCommands(args: string[]): Promise<string> {
    if (args.length === 0) {
      return 'npm <command>\n\nUsage:\n  npm install\n  npm run <script>\n  npm test\n  npm start\n  npm build';
    }

    const subcommand = args[0];

    switch (subcommand) {
      case 'install':
      case 'i':
        return this.handleNpmInstall(args.slice(1));
      case 'run':
        return this.handleNpmRun(args.slice(1));
      case 'test':
        return 'Running tests...\n✓ All tests passed!';
      case 'start':
        return 'Starting development server...\n✓ Server running on http://localhost:3000';
      case 'build':
        return 'Building project...\n✓ Build completed successfully!';
      case 'version':
        return 'npm: 9.0.0\nnode: 18.0.0';
      default:
        return `npm: '${subcommand}' is not a npm command. See 'npm help'.`;
    }
  }

  private handleNpmInstall(packages: string[]): string {
    if (packages.length === 0) {
      return 'Installing dependencies...\n✓ Dependencies installed successfully!';
    }

    return `Installing ${packages.join(', ')}...\n✓ Packages installed successfully!`;
  }

  private handleNpmRun(args: string[]): string {
    if (args.length === 0) {
      return 'Available scripts:\n  dev: vite\n  build: vite build\n  preview: vite preview';
    }

    const script = args[0];
    switch (script) {
      case 'dev':
        return 'Starting development server...\n✓ Server running on http://localhost:3000';
      case 'build':
        return 'Building project...\n✓ Build completed successfully!';
      case 'preview':
        return 'Starting preview server...\n✓ Preview server running on http://localhost:4173';
      default:
        return `Error: Missing script: "${script}"`;
    }
  }

  private async handleNodeCommand(args: string[]): Promise<string> {
    if (args.length === 0) {
      return 'Node.js v18.0.0\nType ".help" for more information.';
    }

    if (args[0] === '--version' || args[0] === '-v') {
      return 'v18.0.0';
    }

    const filename = args[0];
    const path = this.resolvePath(filename);
    const file = this.vfs.files.get(path);

    if (!file) {
      throw new Error(`Error: Cannot find module '${filename}'`);
    }

    return `Executing ${filename}...\n✓ Script executed successfully!`;
  }

  private handleHelp(): string {
    return `Available commands:
  ls [options] [path]     - List directory contents
  cd [path]              - Change directory
  pwd                    - Print working directory
  mkdir <name>           - Create directory
  rm [options] <file>    - Remove files/directories
  cat <file>             - Display file contents
  grep <pattern> <file>  - Search for pattern in file
  echo <text>            - Display text
  env                    - Show environment variables
  export <var>=<value>   - Set environment variable
  history                - Show command history
  clear                  - Clear terminal
  npm <command>          - NPM package manager
  node [file]            - Run Node.js
  help                   - Show this help

Shortcuts:
  ll, la                 - ls -la
  ..                     - cd ..
  cls                    - clear`;
  }

  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path === '/' ? '/' : path.replace(/\/$/, '');
    }

    let resolved = this.vfs.currentDirectory;
    const parts = path.split('/');

    for (const part of parts) {
      if (part === '' || part === '.') {
        continue;
      } else if (part === '..') {
        if (resolved !== '/') {
          resolved = resolved.substring(0, resolved.lastIndexOf('/')) || '/';
        }
      } else {
        resolved = resolved === '/' ? `/${part}` : `${resolved}/${part}`;
      }
    }

    return resolved;
  }

  private isInDirectory(filePath: string, dirPath: string): boolean {
    if (dirPath === '/') {
      return true;
    }
    return filePath.startsWith(dirPath + '/');
  }

  showCommandHistory(): string[] {
    return this.history.map(cmd => cmd.command);
  }

  getEnvironment(key: string): string | undefined {
    return this.environment.get(key);
  }

  setEnvironment(key: string, value: string): void {
    this.environment.set(key, value);
  }

  getCurrentDirectory(): string {
    return this.vfs.currentDirectory;
  }

  getAutoComplete(partial: string): string[] {
    const suggestions: string[] = [];
    
    // Command suggestions
    const commands = ['ls', 'cd', 'pwd', 'mkdir', 'rm', 'cat', 'grep', 'echo', 'env', 'export', 'history', 'clear', 'npm', 'node', 'git', 'code', 'touch', 'cp', 'mv', 'find', 'ps', 'which', 'tree', 'curl', 'wget', 'help'];
    suggestions.push(...commands.filter(cmd => cmd.startsWith(partial)));

    // File/directory suggestions for current directory
    const currentDir = this.vfs.currentDirectory;
    
    // Add directories
    for (const dir of this.vfs.directories) {
      if (this.isInDirectory(dir, currentDir) && dir !== currentDir) {
        const name = dir.substring(currentDir.length + (currentDir === '/' ? 0 : 1));
        if (name && !name.includes('/') && name.startsWith(partial)) {
          suggestions.push(name + '/');
        }
      }
    }

    // Add files
    for (const [filePath] of this.vfs.files) {
      if (this.isInDirectory(filePath, currentDir)) {
        const name = filePath.substring(currentDir.length + (currentDir === '/' ? 0 : 1));
        if (name && !name.includes('/') && name.startsWith(partial)) {
          suggestions.push(name);
        }
      }
    }

    return suggestions.sort();
  }

  private async handleGitCommands(args: string[]): Promise<string> {
    if (args.length === 0) {
      return 'git version 2.34.1\nUsage: git <command> [options]';
    }

    const subcommand = args[0];
    switch (subcommand) {
      case 'status':
        return 'On branch main\nnothing to commit, working tree clean';
      case 'init':
        return 'Initialized empty Git repository in ' + this.vfs.currentDirectory;
      case 'add':
        return args.length > 1 ? `Added ${args.slice(1).join(', ')} to staging area` : 'Nothing specified, nothing added.';
      case 'commit':
        return 'Changes committed successfully';
      case 'push':
        return 'Everything up-to-date';
      case 'pull':
        return 'Already up to date.';
      case 'clone':
        return args.length > 1 ? `Cloning into '${args[1]}'...` : 'You must specify a repository to clone.';
      case 'branch':
        return '* main';
      case 'checkout':
        return args.length > 1 ? `Switched to branch '${args[1]}'` : 'You must specify a branch to checkout.';
      case 'log':
        return 'commit abc123 (HEAD -> main)\nAuthor: Developer <dev@example.com>\nDate: ' + new Date().toDateString() + '\n\n    Initial commit';
      default:
        return `git: '${subcommand}' is not a git command. See 'git --help'.`;
    }
  }

  private handleCodeCommand(args: string[]): string {
    if (args.length === 0) {
      return 'Opening current directory in code editor...';
    }
    return `Opening ${args[0]} in code editor...`;
  }

  private async handleTouch(args: string[]): Promise<string> {
    if (args.length === 0) {
      throw new Error('touch: missing file operand');
    }

    for (const arg of args) {
      const path = this.resolvePath(arg);
      if (!this.vfs.files.has(path)) {
        this.vfs.files.set(path, {
          id: Date.now().toString(),
          name: arg.split('/').pop() || arg,
          type: 'file',
          content: ''
        });
      }
    }
    return '';
  }

  private async handleCp(args: string[]): Promise<string> {
    if (args.length < 2) {
      throw new Error('cp: missing destination file operand');
    }

    const source = this.resolvePath(args[0]);
    const dest = this.resolvePath(args[1]);
    const sourceFile = this.vfs.files.get(source);

    if (!sourceFile) {
      throw new Error(`cp: cannot stat '${args[0]}': No such file or directory`);
    }

    this.vfs.files.set(dest, {
      ...sourceFile,
      id: Date.now().toString(),
      name: dest.split('/').pop() || dest
    });

    return '';
  }

  private async handleMv(args: string[]): Promise<string> {
    if (args.length < 2) {
      throw new Error('mv: missing destination file operand');
    }

    const source = this.resolvePath(args[0]);
    const dest = this.resolvePath(args[1]);
    const sourceFile = this.vfs.files.get(source);

    if (!sourceFile) {
      throw new Error(`mv: cannot stat '${args[0]}': No such file or directory`);
    }

    this.vfs.files.set(dest, {
      ...sourceFile,
      name: dest.split('/').pop() || dest
    });

    this.vfs.files.delete(source);
    return '';
  }

  private async handleFind(args: string[]): Promise<string> {
    const startPath = args[0] || this.vfs.currentDirectory;
    const resolvedPath = this.resolvePath(startPath);
    const results: string[] = [];

    for (const [filePath] of this.vfs.files) {
      if (filePath.startsWith(resolvedPath)) {
        results.push(filePath);
      }
    }

    for (const dirPath of this.vfs.directories) {
      if (dirPath.startsWith(resolvedPath)) {
        results.push(dirPath);
      }
    }

    return results.sort().join('\n');
  }

  private handlePs(): string {
    return 'PID TTY          TIME CMD\n  1 pts/0    00:00:00 bash\n  2 pts/0    00:00:00 node\n  3 pts/0    00:00:00 ps';
  }

  private handleWhich(args: string[]): string {
    if (args.length === 0) {
      return 'which: missing operand';
    }

    const command = args[0];
    const commands = ['ls', 'cd', 'pwd', 'mkdir', 'rm', 'cat', 'grep', 'echo', 'env', 'export', 'history', 'clear', 'npm', 'node', 'git', 'code', 'touch', 'cp', 'mv', 'find', 'ps', 'which', 'tree', 'curl', 'wget'];
    
    if (commands.includes(command)) {
      return `/usr/bin/${command}`;
    }
    
    return `which: no ${command} in (/usr/bin:/bin:/usr/local/bin)`;
  }

  private handleTree(args: string[]): string {
    const startPath = args[0] || this.vfs.currentDirectory;
    const resolvedPath = this.resolvePath(startPath);
    
    let output = resolvedPath + '\n';
    const items: string[] = [];

    for (const dir of this.vfs.directories) {
      if (this.isInDirectory(dir, resolvedPath) && dir !== resolvedPath) {
        const relativePath = dir.substring(resolvedPath.length + 1);
        if (!relativePath.includes('/')) {
          items.push(`├── ${relativePath}/`);
        }
      }
    }

    for (const [filePath] of this.vfs.files) {
      if (this.isInDirectory(filePath, resolvedPath)) {
        const relativePath = filePath.substring(resolvedPath.length + 1);
        if (!relativePath.includes('/')) {
          items.push(`├── ${relativePath}`);
        }
      }
    }

    output += items.join('\n');
    return output;
  }

  private async handleCurl(args: string[]): Promise<string> {
    if (args.length === 0) {
      return 'curl: try \'curl --help\' for more information';
    }
    
    return `Downloading ${args[0]}...\n✓ Download completed`;
  }

  private async handleWget(args: string[]): Promise<string> {
    if (args.length === 0) {
      return 'wget: missing URL';
    }
    
    return `--2024-01-01 12:00:00--  ${args[0]}\nResolving host... done.\nConnecting... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: unspecified [text/html]\nSaving to: 'index.html'\n\n100%[===================>] downloaded`;
  }
}
import Dockerode from 'dockerode';
import { Container } from 'dockerode';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Stream } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import tar from 'tar-stream';
import { LanguageTier, ContainerConfig, getLanguageConfig } from '../config/dynamicLanguages';

interface ExecutionResult {
  output: string;
  error: string;
  executionTime: number;
  containerId?: string;
}

interface CodeFile {
  name: string;
  content: string;
}

interface PersistentContainer {
  id: string;
  containerId: string;
  language: string;
  roomId?: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

export class DynamicDockerService {
  private static instance: DynamicDockerService;
  private docker!: Dockerode;
  private persistentContainers: Map<string, PersistentContainer> = new Map();
  private containerPools: Map<string, Container[]> = new Map();
  private readonly cleanupInterval = 30 * 60 * 1000; // 30 minutes

  constructor() {
    if (DynamicDockerService.instance) {
      return DynamicDockerService.instance;
    }
    
    try {
      // Configure Docker connection based on OS
      if (os.platform() === 'win32') {
        // Windows - Configure for Docker Desktop with named pipe
        console.log('Configuring Docker for Windows...');
        this.docker = new Dockerode({ socketPath: '//./pipe/docker_engine' });
      } else {
        // Linux/Unix - use socket path
        this.docker = new Dockerode({
          socketPath: '/var/run/docker.sock'
        });
      }
      
      console.log('Docker connection configured successfully');
      
      // Test Docker connection (but don't replace the instance)
      this.testDockerConnection();
      
      // Start cleanup routine
      setInterval(() => this.cleanupInactiveContainers(), this.cleanupInterval);
      
      DynamicDockerService.instance = this;
    } catch (error) {
      console.error('Failed to initialize Docker service:', error);
      throw error;
    }
  }

  public static getInstance(): DynamicDockerService {
    if (!DynamicDockerService.instance) {
      DynamicDockerService.instance = new DynamicDockerService();
    }
    return DynamicDockerService.instance;
  }

  /**
   * Get Docker instance (for debugging)
   */
  public getDockerInstance(): Dockerode {
    return this.docker;
  }

  /**
   * Test Docker connection on startup
   */
  private async testDockerConnection(): Promise<void> {
    try {
      await this.docker.listContainers();
      console.log('Docker connection successful via Windows Named Pipe');
    } catch (error: any) {
      console.error('Docker connection failed:', error.message);
      console.log('Please ensure Docker Desktop is running and accessible.');
      console.log('Trying alternative connection methods...');
      
      // Try alternative connection methods without replacing the main instance
      const alternativeOptions = [
        { host: '127.0.0.1', port: 2375, name: 'HTTP (port 2375)' },
        { host: '127.0.0.1', port: 2376, protocol: 'https' as const, name: 'HTTPS (port 2376)' }
      ];

      for (const option of alternativeOptions) {
        try {
          const { name, ...dockerOptions } = option;
          const testDocker = new Dockerode(dockerOptions);
          await testDocker.listContainers();
          console.log(`Alternative Docker connection successful via ${name}`);
          console.log('Consider enabling Docker daemon on tcp://localhost:2375 for better performance.');
          break;
        } catch (altError: any) {
          console.log(`Alternative connection failed via ${option.name}:`, altError.message);
        }
      }
    }
  }

  /**
   * Create a dynamic container with language toolkit installed
   */
  async createDynamicContainer(config: ContainerConfig): Promise<string> {
    console.log('DynamicDockerService: createDynamicContainer called', config);
    const langConfig = getLanguageConfig(config.language);
    if (!langConfig) {
      throw new Error(`Unsupported language: ${config.language}`);
    }
    console.log('Language config retrieved:', langConfig.name);

    const containerId = uuidv4();
    const containerName = config.isPersistent 
      ? `persistent-${config.roomId || containerId}` 
      : `transient-${containerId}`;
    console.log('Container details:', { containerId, containerName });

    try {
      // Create container with base image
      console.log('Creating Docker container with image:', langConfig.baseImage);
      const container = await this.docker.createContainer({
        Image: langConfig.baseImage,
        Cmd: ['sh', '-c', 'while true; do sleep 30; done'], // Keep container alive
        HostConfig: {
          Memory: this.parseMemory(config.memoryOverride || langConfig.memoryLimit),
          NetworkMode: 'bridge',
          AutoRemove: !config.isPersistent,
          SecurityOpt: ['no-new-privileges']
        },
        WorkingDir: '/workspace',
        Tty: true
      });
      console.log('Docker container created, starting...');

      await container.start();
      console.log('Container started, setting up environment...');

      // Get the actual Docker container ID
      const containerInfo = await container.inspect();
      const dockerContainerId = containerInfo.Id;
      console.log('Actual Docker container ID:', dockerContainerId);

      // Setup the language environment
      await this.setupLanguageEnvironment(container, langConfig, config.customPackages);
      console.log('Language environment setup completed');

      // Register persistent container
      if (config.isPersistent) {
        this.persistentContainers.set(containerId, {
          id: containerId,
          containerId: dockerContainerId, // Use actual Docker container ID
          language: config.language,
          roomId: config.roomId,
          createdAt: new Date(),
          lastActivity: new Date(),
          isActive: true
        });
        console.log('Persistent container registered');
      }

      console.log('Container creation completed successfully:', dockerContainerId);
      return dockerContainerId; // Return actual Docker container ID
    } catch (error) {
      console.error('Error creating dynamic container:', error);
      throw new Error(`Failed to create container: ${error}`);
    }
  }

  /**
   * Setup language environment in container
   */
  private async setupLanguageEnvironment(
    container: Container, 
    langConfig: LanguageTier, 
    customPackages?: string[]
  ): Promise<void> {
    try {
      console.log('Setting up language environment...');
      
      // Create workspace directory
      await this.execInContainer(container, ['mkdir', '-p', '/workspace']);

      // Run setup commands
      for (const command of langConfig.setupCommands) {
        console.log('Running setup command:', command);
        await this.execInContainer(container, ['sh', '-c', command]);
      }

      // Install common packages
      if (langConfig.commonPackages && langConfig.commonPackages.length > 0 && langConfig.packageInstallCommand) {
        console.log('Installing common packages:', langConfig.commonPackages);
        await this.installPackages(container, langConfig, langConfig.commonPackages);
      }

      // Install custom packages
      if (customPackages && customPackages.length > 0 && langConfig.packageInstallCommand) {
        console.log('Installing custom packages:', customPackages);
        await this.installPackages(container, langConfig, customPackages);
      }

      console.log('Language environment setup completed successfully');
    } catch (error) {
      console.error('Error setting up language environment:', error);
      throw error;
    }
  }

  /**
   * Install packages in container
   */
  private async installPackages(
    container: Container, 
    langConfig: LanguageTier, 
    packages: string[]
  ): Promise<void> {
    if (!langConfig.packageInstallCommand || langConfig.packageInstallCommand.length === 0) {
      return;
    }

    const installCommand = [...langConfig.packageInstallCommand, ...packages];
    await this.execInContainer(container, installCommand);
  }

  /**
   * Execute a command in a container (for priming)
   */
  async executeCommand(containerId: string, command: string): Promise<ExecutionResult> {
    const container = this.docker.getContainer(containerId);
    
    try {
      console.log(`Executing command in container ${containerId}:`, command);
      const exec = await container.exec({
        Cmd: ['sh', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({});
      const output = await this.readStreamOutput(stream);
      
      return {
        output: output.stdout,
        error: output.stderr,
        executionTime: 0,
        containerId
      };
    } catch (error: any) {
      console.error('Command execution failed:', error);
      return {
        output: '',
        error: `Command execution failed: ${error.message}`,
        executionTime: 0,
        containerId
      };
    }
  }

  /**
   * Execute code in an existing container
   */
  async executeCodeInContainer(containerId: string, code: string, input?: string): Promise<ExecutionResult> {
    const container = this.docker.getContainer(containerId);
    const startTime = Date.now();

    try {
      console.log(`Executing code in container ${containerId}`);
      console.log(`Code content (first 100 chars): ${code.substring(0, 100)}...`);
      
      // Detect language from code content
      let language = 'python'; // default
      let fileExtension = '.py';
      let execCmd = '';
      
      // More robust language detection
      if (code.includes('package main') || code.includes('func main()') || code.includes('import "fmt"')) {
        language = 'go';
        fileExtension = '.go';
      } else if (code.includes('#include') || code.includes('std::') || code.includes('iostream')) {
        language = 'cpp';
        fileExtension = '.cpp';
      } else if (code.includes('public class') || code.includes('System.out') || code.includes('public static void main')) {
        language = 'java';
        fileExtension = '.java';
      } else if (code.includes('console.log') || code.includes('require(') || code.includes('const ') || code.includes('let ') || code.includes('var ') || code.includes('function')) {
        language = 'javascript';
        fileExtension = '.js';
      } else if (code.includes('print(') || code.includes('import ') || code.includes('def ') || code.includes('if __name__')) {
        language = 'python';
        fileExtension = '.py';
      }

      console.log(`Detected language: ${language}`);

      // Create appropriate filename
      let fileName = `code${fileExtension}`;
      if (language === 'java') {
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        if (classMatch) {
          fileName = `${classMatch[1]}.java`;
        }
      }
      
      const tempFile = `/tmp/${fileName}`;
      
      // Escape the code content properly for shell
      const escapedCode = code.replace(/'/g, "'\"'\"'").replace(/\$/g, '\\$').replace(/`/g, '\\`');
      const writeFileCmd = `cat > ${tempFile} << 'EDITRON_EOF'\n${code}\nEDITRON_EOF`;
      
      console.log(`Writing code to file: ${tempFile}`);
      
      // Write the code to a file in the container
      const writeExec = await container.exec({
        Cmd: ['sh', '-c', writeFileCmd],
        AttachStdout: true,
        AttachStderr: true,
      });
      
      const writeStream = await writeExec.start({});
      const writeOutput = await this.readStreamOutput(writeStream);
      
      if (writeOutput.stderr) {
        console.error('Error writing file:', writeOutput.stderr);
        throw new Error(`Failed to write code file: ${writeOutput.stderr}`);
      }

      // Build execution command based on language
      switch (language) {
        case 'python':
          execCmd = `cd /tmp && python3 -u ${tempFile} 2>&1`;
          break;
        case 'javascript':
          execCmd = `cd /tmp && node ${tempFile} 2>&1`;
          break;
        case 'go':
          execCmd = `cd /tmp && timeout 30s go run ${tempFile} 2>&1`;
          break;
        case 'cpp':
          execCmd = `cd /tmp && g++ -o output ${tempFile} 2>&1 && timeout 30s ./output 2>&1`;
          break;
        case 'java':
          const className = fileName.replace('.java', '');
          execCmd = `cd /tmp && javac ${tempFile} 2>&1 && timeout 30s java ${className} 2>&1`;
          break;
        default:
          execCmd = `cd /tmp && python3 -u ${tempFile} 2>&1`;
      }

      console.log(`Execution command: ${execCmd}`);

      // Add input redirection if provided
      if (input) {
        const inputFile = `/tmp/input_${Date.now()}`;
        const writeInputCmd = `cat > ${inputFile} << 'INPUT_EOF'\n${input}\nINPUT_EOF`;
        console.log(`Writing input to file: ${inputFile}`);
        
        const inputExec = await container.exec({
          Cmd: ['sh', '-c', writeInputCmd],
          AttachStdout: true,
          AttachStderr: true,
        });
        await inputExec.start({});
        execCmd += ` < ${inputFile}`;
      }

      console.log(`Final execution command: ${execCmd}`);

      // Execute the code
      const exec = await container.exec({
        Cmd: ['sh', '-c', execCmd],
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        WorkingDir: '/tmp'
      });

      const stream = await exec.start({});
      const output = await this.readStreamOutput(stream);
      
      console.log(`Execution completed. STDOUT: ${output.stdout.substring(0, 200)}...`);
      console.log(`Execution completed. STDERR: ${output.stderr.substring(0, 200)}...`);
      
      // Cleanup temporary files
      const cleanupCmd = `rm -f ${tempFile} /tmp/input_* /tmp/output /tmp/*.class`;
      const cleanupExec = await container.exec({
        Cmd: ['sh', '-c', cleanupCmd],
        AttachStdout: true,
        AttachStderr: true,
      });
      await cleanupExec.start({});

      // Return result - if there's stderr but no stdout, treat stderr as error
      let finalOutput = output.stdout;
      let finalError = output.stderr;
      
      // For compilation languages, compilation errors should be treated as errors
      if (language === 'cpp' || language === 'java') {
        if (output.stderr && output.stderr.includes('error:')) {
          finalError = output.stderr;
          finalOutput = '';
        }
      }

      return {
        output: finalOutput,
        error: finalError,
        executionTime: Date.now() - startTime,
        containerId
      };
    } catch (error: any) {
      console.error('Code execution failed:', error);
      return {
        output: '',
        error: `Execution failed: ${error.message}. Please make sure Docker is running and the container is accessible.`,
        executionTime: Date.now() - startTime,
        containerId
      };
    }
  }

  /**
   * Execute code with multiple files in an existing container
   */
  async executeCode(containerId: string, files: CodeFile[], entryFile?: string): Promise<ExecutionResult> {
    const container = this.docker.getContainer(containerId);
    const startTime = Date.now();

    try {
      console.log(`Executing multi-file code in container ${containerId}`);
      
      // Create files in the container
      for (const file of files) {
        const filePath = `/workspace/${file.name}`;
        const writeFileCmd = `echo '${file.content.replace(/'/g, "'\\''")}' > ${filePath}`;
        
        const writeExec = await container.exec({
          Cmd: ['sh', '-c', writeFileCmd],
          AttachStdout: true,
          AttachStderr: true,
        });
        await writeExec.start({});
      }

      // Determine which file to execute
      const fileToExecute = entryFile || files[0]?.name;
      if (!fileToExecute) {
        throw new Error('No file to execute');
      }

      // Get file extension to determine execution command
      const extension = path.extname(fileToExecute).toLowerCase();
      let execCommand: string;

      switch (extension) {
        case '.py':
          execCommand = `cd /workspace && python3 ${fileToExecute}`;
          break;
        case '.js':
          execCommand = `cd /workspace && node ${fileToExecute}`;
          break;
        case '.go':
          execCommand = `cd /workspace && go run ${fileToExecute}`;
          break;
        case '.cpp':
        case '.cc':
        case '.cxx':
          const execName = fileToExecute.replace(/\.[^/.]+$/, "");
          execCommand = `cd /workspace && g++ -o ${execName} ${fileToExecute} && ./${execName}`;
          break;
        case '.java':
          const className = fileToExecute.replace(/\.[^/.]+$/, "");
          execCommand = `cd /workspace && javac ${fileToExecute} && java ${className}`;
          break;
        default:
          throw new Error(`Unsupported file extension: ${extension}`);
      }

      // Execute the code
      const exec = await container.exec({
        Cmd: ['sh', '-c', execCommand],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({});
      const result = await this.readStreamOutput(stream);

      return {
        output: result.stdout,
        error: result.stderr,
        executionTime: Date.now() - startTime,
        containerId
      };

    } catch (error: any) {
      console.error(`Error executing multi-file code in container ${containerId}:`, error);
      return {
        output: '',
        error: `Execution failed: ${error.message}`,
        executionTime: Date.now() - startTime,
        containerId
      };
    }
  }

  /**
   * Execute command in container with timeout
   */
  private async execInContainer(
    container: Container, 
    command: string[], 
    timeout: number = 30000
  ): Promise<{ output: string; error: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        const exec = await (container as any).exec({
          Cmd: command,
          AttachStdout: true,
          AttachStderr: true,
          WorkingDir: '/workspace'
        });

        const stream = await exec.start({ Detach: false });
        
        let output = '';
        let error = '';

        // Set timeout
        const timeoutHandle = setTimeout(() => {
          resolve({ output: output || '', error: 'Execution timed out' });
        }, timeout);

        stream.on('data', (chunk: Buffer) => {
          const data = chunk.toString();
          // Docker multiplexes stdout/stderr, first byte indicates stream type
          if (chunk[0] === 1) {
            output += data.slice(8); // stdout
          } else if (chunk[0] === 2) {
            error += data.slice(8); // stderr
          }
        });

        stream.on('end', () => {
          clearTimeout(timeoutHandle);
          resolve({ output, error });
        });

        stream.on('error', (err: any) => {
          clearTimeout(timeoutHandle);
          reject(err);
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Verify if a container exists and is running
   */
  async verifyContainerExists(containerId: string): Promise<boolean> {
    try {
      const container = this.docker.getContainer(containerId);
      const containerInfo = await container.inspect();
      return containerInfo.State.Running;
    } catch (error: any) {
      console.log(`Container ${containerId} not found or not running:`, error.message);
      return false;
    }
  }

  /**
   * Get container by ID
   */
  private async getContainer(containerId: string): Promise<Container | null> {
    try {
      const persistentContainer = this.persistentContainers.get(containerId);
      if (persistentContainer) {
        return (this.docker as any).getContainer(persistentContainer.containerId);
      }

      // For transient containers, try to get by name
      const containers = await (this.docker as any).listContainers({ all: true });
      const containerInfo = containers.find((c: any) => 
        c.Names.some((name: string) => name.includes(containerId))
      );

      if (containerInfo) {
        return (this.docker as any).getContainer(containerInfo.Id);
      }

      return null;
    } catch (error) {
      console.error('Error getting container:', error);
      return null;
    }
  }

  /**
   * Get container status and info
   */
  async getContainerStatus(containerId: string): Promise<any> {
    try {
      const container = await this.getContainer(containerId);
      if (!container) {
        return { status: 'not_found' };
      }

      const info = await (container as any).inspect();
      const persistentInfo = this.persistentContainers.get(containerId);

      return {
        status: info.State.Status,
        created: info.Created,
        language: persistentInfo?.language,
        roomId: persistentInfo?.roomId,
        lastActivity: persistentInfo?.lastActivity,
        isActive: persistentInfo?.isActive,
        memory: info.HostConfig.Memory
      };
    } catch (error: any) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Destroy container
   */
  async destroyContainer(containerId: string): Promise<boolean> {
    try {
      const container = await this.getContainer(containerId);
      if (!container) {
        return false;
      }

      await (container as any).stop();
      await (container as any).remove({ force: true });

      // Remove from persistent containers map
      this.persistentContainers.delete(containerId);

      return true;
    } catch (error) {
      console.error('Error destroying container:', error);
      return false;
    }
  }

  /**
   * List all containers
   */
  async listContainers(): Promise<any[]> {
    const containers = [];
    
    for (const [containerUuid, container] of this.persistentContainers.entries()) {
      const status = await this.getContainerStatus(containerUuid);
      containers.push({
        uuid: containerUuid,
        ...container,
        status
      });
    }

    return containers;
  }

  /**
   * Cleanup inactive containers
   */
  private async cleanupInactiveContainers(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 60 * 60 * 1000; // 1 hour

    for (const [id, container] of this.persistentContainers.entries()) {
      const inactive = now.getTime() - container.lastActivity.getTime() > inactiveThreshold;
      
      if (inactive && !container.roomId) { // Don't cleanup room containers automatically
        console.log(`Cleaning up inactive container: ${id}`);
        await this.destroyContainer(id);
      }
    }
  }

  /**
   * Helper methods
   */
  private updateLastActivity(containerId: string): void {
    const container = this.persistentContainers.get(containerId);
    if (container) {
      container.lastActivity = new Date();
    }
  }

  private parseMemory(memoryStr: string): number {
    const match = memoryStr.match(/^(\d+)([kmgKMG]?)$/);
    if (!match) return 268435456; // 256MB default

    const value = parseInt(match[1]);
    const unit = (match[2] || '').toLowerCase();

    const multipliers: Record<string, number> = {
      '': 1,
      'k': 1024,
      'm': 1024 * 1024,
      'g': 1024 * 1024 * 1024
    };

    return value * (multipliers[unit] || 1);
  }

  private async readStreamOutput(stream: any): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      stream.on('data', (chunk: Buffer) => {
        const data = chunk.toString();
        // Docker multiplexes stdout/stderr, first byte indicates stream type
        if (chunk[0] === 1) {
          stdout += data.slice(8); // stdout
        } else if (chunk[0] === 2) {
          stderr += data.slice(8); // stderr
        }
      });

      stream.on('end', () => {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      });

      stream.on('error', (err: any) => {
        reject(err);
      });
    });
  }
}

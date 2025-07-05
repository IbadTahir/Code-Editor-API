import Dockerode from 'dockerode';
import { Container } from 'dockerode';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Stream } from 'stream';
import { LanguageConfig, getLanguageConfig } from '../utils/languageConfigs';

interface ExecutionResult {
    output: string;
    error: string;
    executionTime: number;
}

export class DockerService {
    private docker: Dockerode;    private readonly defaultTimeout = 10000; // 10 seconds
    private readonly maxMemory = '256m'; // 256 megabytes

    constructor() {
        // Connect to Docker daemon - auto-detect platform
        if (process.platform === 'win32') {
            // Windows - use named pipe
            this.docker = new Dockerode({
                socketPath: '//./pipe/docker_engine'
            });
        } else {
            // Linux/macOS - use socket
            this.docker = new Dockerode({
                socketPath: '/var/run/docker.sock'
            });
        }
    }

    private async getContainerOutput(stream: Stream): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const chunks: Buffer[] = [];
            stream.on('data', (chunk: Buffer) => chunks.push(chunk));
            stream.on('error', (err) => reject(err));
            stream.on('end', () => {
                const result = Buffer.concat(chunks);
                
                // Docker uses 8-byte headers for multiplexing stdout/stderr
                // Format: [STREAM_TYPE, 0, 0, 0, SIZE1, SIZE2, SIZE3, SIZE4, ...DATA...]
                let cleanOutput = '';
                let offset = 0;
                
                while (offset < result.length) {
                    if (offset + 8 > result.length) break;
                    
                    // Read the 4-byte size (big-endian)
                    const size = result.readUInt32BE(offset + 4);
                    const dataStart = offset + 8;
                    const dataEnd = dataStart + size;
                    
                    if (dataEnd > result.length) break;
                    
                    // Extract the actual data (skip the 8-byte header)
                    const data = result.subarray(dataStart, dataEnd).toString('utf8');
                    cleanOutput += data;
                    
                    offset = dataEnd;
                }
                
                resolve(cleanOutput.trim());
            });
        });
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private getMemoryInBytes(memoryStr: string): number {
        const value = parseInt(memoryStr);
        const unit = memoryStr.slice(-1).toLowerCase();
        const multiplier = unit === 'g' ? 1024 * 1024 * 1024 :
                         unit === 'm' ? 1024 * 1024 :
                         unit === 'k' ? 1024 : 1;
        return value * multiplier;
    }

    async executeCode(language: string, code: string, inputData?: string): Promise<ExecutionResult> {
        const config = getLanguageConfig(language);
        if (!config) {
            throw new Error(`Unsupported language: ${language}`);
        }

        const startTime = Date.now();
        const tempDir = path.join(os.tmpdir(), `code-${Date.now()}`);
        
        // Special handling for Java - extract class name from code
        let fileName = `code${config.fileExtension}`;
        if (language.toLowerCase() === 'java') {
            const classMatch = code.match(/public\s+class\s+(\w+)/);
            if (classMatch) {
                fileName = `${classMatch[1]}.java`;
            }
        }
        
        const filePath = path.join(tempDir, fileName);

        try {
            // Create temporary directory and write code file
            await fs.mkdir(tempDir, { recursive: true });
            await fs.writeFile(filePath, code);

            // Create input file if input data is provided
            let containerCmd = config.buildCommand(fileName);
            if (inputData) {
                const inputFilePath = path.join(tempDir, 'input.txt');
                await fs.writeFile(inputFilePath, inputData);
                // For shell commands, wrap the entire command with input redirection
                if (containerCmd[0] === 'sh' && containerCmd[1] === '-c') {
                    containerCmd = ['sh', '-c', `${containerCmd[2]} < input.txt`];
                } else {
                    // For simple commands, create a wrapper script
                    containerCmd = ['sh', '-c', `${containerCmd.join(' ')} < input.txt`];
                }
            }

            // Create container
            const container: Container = await this.docker.createContainer({
                Image: config.image,
                Cmd: containerCmd,
                HostConfig: {
                    Memory: 268435456, // 256MB in bytes
                    MemorySwap: 536870912, // 512MB in bytes
                    MemoryReservation: 6291456, // 6MB minimum reservation
                    AutoRemove: true,
                    Binds: [`${tempDir}:/app`],
                    SecurityOpt: ['no-new-privileges'],
                    OomKillDisable: false
                },
                WorkingDir: '/app',
                Tty: false
            });

            // Start container and capture output
            let output = '';
            let error = '';

            try {
                await container.start();

                // Get container logs
                const logStream = await container.logs({
                    follow: true,
                    stdout: true,
                    stderr: true
                }) as unknown as Stream;

                output = await this.getContainerOutput(logStream);
            } catch (err) {
                error = err instanceof Error ? err.message : 'Container execution failed';
            }

            const executionTime = Date.now() - startTime;

            // Cleanup container
            try {
                await container.remove({ force: true });
            } catch (err) {
                console.error('Error removing container:', err);
            }

            return {
                output,
                error,
                executionTime
            };
        } catch (error) {
            console.error('Docker execution error:', error);
            return {
                output: '',
                error: error instanceof Error ? error.message : 'Docker execution failed',
                executionTime: Date.now() - startTime
            };
        } finally {
            // Cleanup temporary directory
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (error) {
                console.error('Error cleaning up temp directory:', error);
            }
        }
    }
}

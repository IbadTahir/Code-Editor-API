import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execAsync = promisify(exec);

interface OptimizedImage {
  name: string;
  tag: string;
  language: string;
  baseImage: string;
}

export class ImageManager {
  private static instance: ImageManager;
  private readonly optimizedImages: OptimizedImage[] = [
    { name: 'leviathan-python-optimized', tag: 'latest', language: 'python', baseImage: 'python:3.11-slim' },
    { name: 'leviathan-node-optimized', tag: 'latest', language: 'javascript', baseImage: 'node:18-slim' },
    { name: 'leviathan-go-optimized', tag: 'latest', language: 'go', baseImage: 'golang:1.21-alpine' },
    { name: 'leviathan-java-optimized', tag: 'latest', language: 'java', baseImage: 'openjdk:17-slim' },
    { name: 'leviathan-cpp-optimized', tag: 'latest', language: 'cpp', baseImage: 'gcc:latest' }
  ];

  private constructor() {}

  public static getInstance(): ImageManager {
    if (!ImageManager.instance) {
      ImageManager.instance = new ImageManager();
    }
    return ImageManager.instance;
  }

  /**
   * Initialize images on server startup
   */
  async initializeImages(): Promise<void> {
    console.log('🔍 Checking for optimized Docker images...');
    
    try {
      // Check if Docker is available
      await this.checkDockerAvailability();
      
      // Check which images are missing
      const missingImages = await this.checkMissingImages();
      
      if (missingImages.length === 0) {
        console.log('✅ All optimized images are available');
        return;
      }

      console.log(`🔨 Building ${missingImages.length} missing optimized images...`);
      console.log(`Missing images: ${missingImages.map(img => img.name).join(', ')}`);
      
      // Build missing images
      await this.buildOptimizedImages();
      
      console.log('✅ All optimized images ready!');
      
    } catch (error: any) {
      console.warn('⚠️  Failed to initialize optimized images:', error.message);
      console.warn('⚠️  Falling back to base images (slower performance)');
    }
  }

  /**
   * Check if Docker is available
   */
  private async checkDockerAvailability(): Promise<void> {
    try {
      await execAsync('docker --version');
    } catch (error) {
      throw new Error('Docker is not available or not running');
    }
  }

  /**
   * Check which optimized images are missing
   */
  private async checkMissingImages(): Promise<OptimizedImage[]> {
    const missingImages: OptimizedImage[] = [];
    
    for (const image of this.optimizedImages) {
      const imageExists = await this.checkImageExists(image.name, image.tag);
      if (!imageExists) {
        missingImages.push(image);
      }
    }
    
    return missingImages;
  }

  /**
   * Check if a specific Docker image exists
   */
  private async checkImageExists(imageName: string, tag: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker images -q ${imageName}:${tag}`);
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Build all optimized images using the appropriate script for the OS
   */
  private async buildOptimizedImages(): Promise<void> {
    const platform = os.platform();
    const scriptPath = this.getBuildScriptPath(platform);
    
    console.log(`🏗️  Building images using ${scriptPath}...`);
    
    try {
      // Make script executable on Unix-like systems
      if (platform !== 'win32') {
        await execAsync(`chmod +x "${scriptPath}"`);
      }
      
      // Execute the build script
      const { stdout, stderr } = await execAsync(`"${scriptPath}"`, {
        cwd: path.dirname(scriptPath),
        timeout: 600000 // 10 minutes timeout
      });
      
      if (stdout) console.log(stdout);
      if (stderr) console.warn(stderr);
      
    } catch (error: any) {
      throw new Error(`Failed to build optimized images: ${error.message}`);
    }
  }

  /**
   * Get the appropriate build script path for the current OS
   */
  private getBuildScriptPath(platform: string): string {
    const workspaceRoot = process.cwd();
    
    switch (platform) {
      case 'win32':
        return path.join(workspaceRoot, 'build-optimized-images.bat');
      case 'darwin':
      case 'linux':
      default:
        return path.join(workspaceRoot, 'build-optimized-images.sh');
    }
  }

  /**
   * Get the optimized image name for a language, fallback to base image if not available
   */
  getOptimizedImageName(language: string): string {
    const optimizedImage = this.optimizedImages.find(img => img.language === language);
    
    if (optimizedImage) {
      // Check if the optimized image exists (synchronous check for runtime usage)
      return `${optimizedImage.name}:${optimizedImage.tag}`;
    }
    
    // Fallback to base images
    const fallbackImages: Record<string, string> = {
      'python': 'python:3.11-slim',
      'javascript': 'node:18-slim',
      'go': 'golang:1.21-alpine',
      'java': 'openjdk:17-slim',
      'cpp': 'gcc:latest'
    };
    
    return fallbackImages[language] || 'python:3.11-slim';
  }

  /**
   * Check if optimized image is available for a language
   */
  async isOptimizedImageAvailable(language: string): Promise<boolean> {
    const optimizedImage = this.optimizedImages.find(img => img.language === language);
    if (!optimizedImage) return false;
    
    return await this.checkImageExists(optimizedImage.name, optimizedImage.tag);
  }

  /**
   * Get list of all optimized images
   */
  getOptimizedImages(): OptimizedImage[] {
    return [...this.optimizedImages];
  }

  /**
   * Force rebuild of specific language image
   */
  async rebuildLanguageImage(language: string): Promise<void> {
    const image = this.optimizedImages.find(img => img.language === language);
    if (!image) {
      throw new Error(`No optimized image configuration found for language: ${language}`);
    }

    const platform = os.platform();
    const isWindows = platform === 'win32';
    
    // Build specific language image
    const dockerfilePath = `docker/${language}/Dockerfile.optimized`;
    const contextPath = `docker/${language}/`;
    
    const command = `docker build -t ${image.name}:${image.tag} -f ${dockerfilePath} ${contextPath}`;
    
    console.log(`🔨 Rebuilding ${language} optimized image...`);
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000 // 5 minutes timeout for single image
      });
      
      if (stdout) console.log(stdout);
      if (stderr) console.warn(stderr);
      
      console.log(`✅ ${language} image rebuilt successfully`);
    } catch (error: any) {
      throw new Error(`Failed to rebuild ${language} image: ${error.message}`);
    }
  }
}

export default ImageManager;

import { Request, Response } from 'express';
import { DynamicDockerService } from '../services/dynamicDockerService';
import { getLanguageConfig, getSupportedLanguages, getLanguagesByTier } from '../config/dynamicLanguages';

interface CreateContainerRequest {
  language: string;
  isPersistent?: boolean;
  roomId?: string;
  customPackages?: string[];
  memoryOverride?: string;
  timeoutOverride?: number;
}

interface ExecuteCodeRequest {
  containerId: string;
  files: Array<{
    name: string;
    content: string;
  }>;
  entryFile?: string;
}

const dynamicDockerService = DynamicDockerService.getInstance();

/**
 * Get all supported languages with their configurations
 */
export const getSupportedLanguagesController = async (req: Request, res: Response) => {
  try {
    const languages = getSupportedLanguages();
    const languageConfigs = languages.map(lang => {
      const config = getLanguageConfig(lang);
      return {
        name: lang,
        displayName: config?.name,
        cost: config?.cost,
        memoryLimit: config?.memoryLimit,
        executionTimeout: config?.executionTimeout,
        fileExtension: config?.fileExtension,
        commonPackages: config?.commonPackages
      };
    });

    res.json({
      success: true,
      languages: languageConfigs,
      count: languages.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get supported languages'
    });
  }
};

/**
 * Get languages by tier (low, medium, high cost)
 */
export const getLanguagesByTierController = async (req: Request, res: Response) => {
  try {
    const { tier } = req.params;
    
    if (!['low', 'medium', 'high'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier. Must be: low, medium, or high'
      });
    }

    const languages = getLanguagesByTier(tier as 'low' | 'medium' | 'high');
    
    res.json({
      success: true,
      tier,
      languages: languages.map(config => ({
        name: config.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        displayName: config.name,
        memoryLimit: config.memoryLimit,
        executionTimeout: config.executionTimeout,
        concurrentLimit: config.concurrentLimit
      })),
      count: languages.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get languages by tier'
    });
  }
};

/**
 * Create a new dynamic container
 */
export const createDynamicContainer = async (req: Request, res: Response) => {
  try {
    const {
      language,
      isPersistent = false,
      roomId,
      customPackages,
      memoryOverride,
      timeoutOverride
    }: CreateContainerRequest = req.body;

    // Validate language
    const langConfig = getLanguageConfig(language);
    if (!langConfig) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}`
      });
    }

    // Create container
    const containerId = await dynamicDockerService.createDynamicContainer({
      language,
      isPersistent,
      roomId,
      customPackages,
      memoryOverride,
      timeoutOverride
    });

    res.json({
      success: true,
      containerId,
      language,
      isPersistent,
      roomId,
      config: {
        memoryLimit: memoryOverride || langConfig.memoryLimit,
        executionTimeout: timeoutOverride || langConfig.executionTimeout,
        cost: langConfig.cost
      }
    });
  } catch (error) {
    console.error('Error creating dynamic container:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create container'
    });
  }
};

/**
 * Execute code in a container
 */
export const executeCodeInContainer = async (req: Request, res: Response) => {
  try {
    const { containerId, files, entryFile }: ExecuteCodeRequest = req.body;

    if (!containerId) {
      return res.status(400).json({
        success: false,
        error: 'Container ID is required'
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one file is required'
      });
    }

    const result = await dynamicDockerService.executeCode(containerId, files, entryFile);

    res.json({
      success: true,
      containerId,
      output: result.output,
      error: result.error,
      executionTime: result.executionTime
    });
  } catch (error) {
    console.error('Error executing code:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Code execution failed'
    });
  }
};

/**
 * Get container status and information
 */
export const getContainerStatus = async (req: Request, res: Response) => {
  try {
    const { containerId } = req.params;

    if (!containerId) {
      return res.status(400).json({
        success: false,
        error: 'Container ID is required'
      });
    }

    const status = await dynamicDockerService.getContainerStatus(containerId);

    res.json({
      success: true,
      containerId,
      status
    });
  } catch (error) {
    console.error('Error getting container status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get container status'
    });
  }
};

/**
 * Destroy a container
 */
export const destroyContainer = async (req: Request, res: Response) => {
  try {
    const { containerId } = req.params;

    if (!containerId) {
      return res.status(400).json({
        success: false,
        error: 'Container ID is required'
      });
    }

    const destroyed = await dynamicDockerService.destroyContainer(containerId);

    if (destroyed) {
      res.json({
        success: true,
        message: 'Container destroyed successfully',
        containerId
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Container not found or could not be destroyed'
      });
    }
  } catch (error) {
    console.error('Error destroying container:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to destroy container'
    });
  }
};

/**
 * List all containers
 */
export const listContainers = async (req: Request, res: Response) => {
  try {
    const containers = await dynamicDockerService.listContainers();

    res.json({
      success: true,
      containers,
      count: containers.length
    });
  } catch (error) {
    console.error('Error listing containers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list containers'
    });
  }
};

/**
 * Create a transient container and execute code in one request
 */
export const executeCodeTransient = async (req: Request, res: Response) => {
  try {
    const { language, files, entryFile, customPackages } = req.body;

    if (!language) {
      return res.status(400).json({
        success: false,
        error: 'Language is required'
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one file is required'
      });
    }

    // Create transient container
    const containerId = await dynamicDockerService.createDynamicContainer({
      language,
      isPersistent: false,
      customPackages
    });

    // Execute code
    const result = await dynamicDockerService.executeCode(containerId, files, entryFile);

    res.json({
      success: true,
      language,
      output: result.output,
      error: result.error,
      executionTime: result.executionTime,
      containerId: result.containerId
    });
  } catch (error) {
    console.error('Error executing transient code:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Transient execution failed'
    });
  }
};

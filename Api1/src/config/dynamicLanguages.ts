export interface LanguageTier {
  name: string;
  cost: 'low' | 'medium' | 'high';
  memoryLimit: string;
  cpuLimit: number;
  executionTimeout: number;
  concurrentLimit: number;
  baseImage: string;
  setupCommands: string[];
  fileExtension: string;
  executeCommand: (fileName: string) => string[];
  packageInstallCommand?: string[];
  commonPackages?: string[];
  active?: boolean;
  // New: packages that require build tools
  packagesRequiringBuildTools?: string[];
  buildToolsInstallCommand?: string[];
}

export interface ContainerConfig {
  language: string;
  isPersistent: boolean;
  roomId?: string;
  customPackages?: string[];
  memoryOverride?: string;
  timeoutOverride?: number;
}

export const languageTiers: Record<string, LanguageTier> = {
  // Low-cost, fast languages
  python: {
    name: 'Python',
    cost: 'low',
    memoryLimit: '512m', // Increased for library support
    cpuLimit: 1.0,
    executionTimeout: 30000, // 30 seconds for complex operations
    concurrentLimit: 20,
    baseImage: 'leviathan-python-optimized',
    setupCommands: [
      'apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev build-essential && rm -rf /var/lib/apt/lists/*',
      'pip install --no-cache-dir pip --upgrade',
      'pip install --no-cache-dir requests urllib3 numpy pandas matplotlib seaborn plotly scikit-learn'
    ],
    fileExtension: '.py',
    executeCommand: (fileName) => ['python', '-u', fileName], // -u for unbuffered output
    packageInstallCommand: ['pip', 'install', '--no-cache-dir'],
    commonPackages: ['requests', 'numpy', 'pandas', 'matplotlib', 'seaborn', 'plotly', 'scikit-learn', 'flask', 'django', 'fastapi'],
    packagesRequiringBuildTools: ['numpy', 'pandas', 'scipy', 'matplotlib', 'pillow', 'psycopg2', 'lxml', 'scikit-learn'],
    buildToolsInstallCommand: ['apt-get', 'update', '&&', 'apt-get', 'install', '-y', '--no-install-recommends', 'build-essential', '&&', 'rm', '-rf', '/var/lib/apt/lists/*'],
    active: true
  },

  javascript: {
    name: 'JavaScript (Node.js)',
    cost: 'low',
    memoryLimit: '512m', // Increased for library support
    cpuLimit: 1.0,
    executionTimeout: 30000, // 30 seconds for complex operations
    concurrentLimit: 20,
    baseImage: 'leviathan-node-optimized',
    setupCommands: [
      'apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*',
      'npm install -g npm@latest'
    ],
    fileExtension: '.js',
    executeCommand: (fileName) => ['node', fileName],
    packageInstallCommand: ['npm', 'install', '--no-save'],
    commonPackages: ['lodash', 'axios', 'express', 'socket.io', 'moment', 'uuid', 'fs-extra', 'chalk'],
    active: true
  },

  go: {
    name: 'Go',
    cost: 'low',
    memoryLimit: '200m',
    cpuLimit: 0.5,
    executionTimeout: 8000,
    concurrentLimit: 25,
    baseImage: 'leviathan-go-optimized',
    setupCommands: [
      'apk add --no-cache git'
    ],
    fileExtension: '.go',
    executeCommand: (fileName) => ['go', 'run', fileName],
    packageInstallCommand: ['go', 'get'],
    commonPackages: [],
    active: true
  },

  // Medium-cost languages
  cpp: {
    name: 'C++',
    cost: 'medium',
    memoryLimit: '300m',
    cpuLimit: 1.0,
    executionTimeout: 20000,
    concurrentLimit: 12,
    baseImage: 'leviathan-cpp-optimized',
    setupCommands: [
      'apt-get update && apt-get install -y --no-install-recommends && rm -rf /var/lib/apt/lists/*'
    ],
    fileExtension: '.cpp',
    executeCommand: (fileName) => ['sh', '-c', `g++ -std=c++17 ${fileName} -o output && ./output`],
    packageInstallCommand: [],
    commonPackages: [],
    active: true
  },

  java: {
    name: 'Java',
    cost: 'medium',
    memoryLimit: '512m',
    cpuLimit: 1.0,
    executionTimeout: 15000,
    concurrentLimit: 10,
    baseImage: 'leviathan-java-optimized',
    setupCommands: [
      'apt-get update && apt-get install -y --no-install-recommends && rm -rf /var/lib/apt/lists/*'
    ],
    fileExtension: '.java',
    executeCommand: (fileName) => ['sh', '-c', `javac ${fileName} && java ${fileName.replace('.java', '')}`],
    packageInstallCommand: [],
    commonPackages: [],
    active: true
  }
};

export const getLanguageConfig = (language: string): LanguageTier | undefined => {
  const config = languageTiers[language.toLowerCase()];
  return config?.active !== false ? config : undefined;
};

export const getSupportedLanguages = (): string[] => {
  return Object.keys(languageTiers).filter(key => 
    languageTiers[key].active !== false
  );
};

export const getActiveLanguages = (): Record<string, LanguageTier> => {
  return Object.fromEntries(
    Object.entries(languageTiers).filter(([_, config]) => config.active !== false)
  );
};

export const getLanguagesByTier = (cost: 'low' | 'medium' | 'high'): LanguageTier[] => {
  return Object.values(languageTiers).filter(lang => 
    lang.cost === cost && lang.active !== false
  );
};

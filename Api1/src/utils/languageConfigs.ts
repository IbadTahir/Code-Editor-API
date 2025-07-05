export interface LanguageConfig {
    image: string;
    fileExtension: string;
    buildCommand: (fileName: string) => string[];
}

const languageConfigs: Record<string, LanguageConfig> = {
    python: {
        image: 'leviathan-python-optimized:latest',
        fileExtension: '.py',
        buildCommand: (fileName: string) => ['python', '-u', fileName]
    },
    javascript: {
        image: 'leviathan-node-optimized:latest',
        fileExtension: '.js',
        buildCommand: (fileName: string) => ['node', fileName]
    },
    go: {
        image: 'leviathan-go-optimized:latest',
        fileExtension: '.go',
        buildCommand: (fileName: string) => ['go', 'run', fileName]
    },
    cpp: {
        image: 'leviathan-cpp-optimized:latest',
        fileExtension: '.cpp',
        buildCommand: (fileName: string) => ['sh', '-c', `g++ -o output ${fileName} && ./output`]
    },
    java: {
        image: 'leviathan-java-optimized:latest',
        fileExtension: '.java',
        buildCommand: (fileName: string) => {
            const className = fileName.replace('.java', '');
            return ['sh', '-c', `javac ${fileName} && java ${className}`];
        }
    }
};

export const getLanguageConfig = (language: string): LanguageConfig | undefined => {
    return languageConfigs[language.toLowerCase()];
};

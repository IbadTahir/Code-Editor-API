export interface CodeExecutionRequest {
    language?: string;
    code?: string;
    input?: string; // Input data for the program
    inputLines?: string[]; // Alternative: array of input lines
    timeout?: number; // Custom timeout in milliseconds
}

export const validateExecutionRequest = (body: CodeExecutionRequest): string | null => {
    if (!body.language) {
        return 'Language is required';
    }

    if (!body.code) {
        return 'Code is required';
    }

    const language = body.language.toLowerCase();
    const supportedLanguages = ['python', 'javascript', 'go', 'cpp', 'java'];
    
    if (!supportedLanguages.includes(language)) {
        return `Unsupported language. Supported languages are: ${supportedLanguages.join(', ')}`;
    }

    return null;
};

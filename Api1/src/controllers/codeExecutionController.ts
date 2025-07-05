import { Request, Response } from 'express';
import { DockerService } from '../services/dockerService';
import { validateExecutionRequest, CodeExecutionRequest } from '../utils/validators';

interface CodeExecutionResponse {
    success: boolean;
    output?: string;
    error?: string;
    executionTime?: number;
    inputProvided?: boolean;
}

const dockerService = new DockerService();

export const executeCode = async (req: Request<{}, CodeExecutionResponse, CodeExecutionRequest>, res: Response<CodeExecutionResponse>) => {
    try {
        const { language, code, input, inputLines } = req.body;

        // Validate request
        const validationError = validateExecutionRequest(req.body);
        if (validationError) {
            return res.status(400).json({
                success: false,
                error: validationError
            });
        }

        // Process input data
        let inputData: string | undefined;
        if (input) {
            inputData = input;
        } else if (inputLines && inputLines.length > 0) {
            inputData = inputLines.join('\n');
        }

        // Execute code in Docker container
        const result = await dockerService.executeCode(language!, code!, inputData);

        res.json({
            success: true,
            output: result.output,
            error: result.error,
            executionTime: result.executionTime,
            inputProvided: !!inputData
        });
    } catch (error) {
        console.error('Code execution error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during code execution'
        });
    }
};

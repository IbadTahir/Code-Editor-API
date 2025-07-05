import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);

export const createTempDir = async (dirPath: string): Promise<void> => {
    try {
        await mkdirAsync(dirPath, { recursive: true });
    } catch (error) {
        console.error('Error creating temp directory:', error);
        throw error;
    }
};

export const writeCodeToFile = async (filePath: string, code: string): Promise<void> => {
    try {
        await writeFileAsync(filePath, code, 'utf8');
    } catch (error) {
        console.error('Error writing code file:', error);
        throw error;
    }
};

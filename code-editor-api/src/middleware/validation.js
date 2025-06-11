const validateSession = (req, res, next) => {
    const { code, language, title, userId } = req.body;
    const errors = [];

    if (!code) errors.push('Code is required');
    if (!language) errors.push('Language is required');
    if (!title) errors.push('Title is required');
    if (!userId) errors.push('User ID is required');

    if (errors.length > 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors
        });
    }

    next();
};

const validateCodeExecution = (req, res, next) => {
    const { code, language } = req.body;
    const errors = [];

    if (!code) errors.push('Code is required');
    if (!language) errors.push('Language is required');

    const supportedLanguages = ['javascript', 'python', 'java'];
    if (!supportedLanguages.includes(language?.toLowerCase())) {
        errors.push(`Language not supported. Supported languages are: ${supportedLanguages.join(', ')}`);
    }

    if (errors.length > 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors
        });
    }

    next();
};

module.exports = {
    validateSession,
    validateCodeExecution
};

const CodeSession = require('../models/CodeSession');

// Save a new code session
exports.createSession = async (req, res) => {
  try {
    const { code, language, title, userId } = req.body;
    
    if (!code || !language || !title || !userId) {
      return res.status(400).json({ 
        message: 'Missing required fields. Please provide code, language, title, and userId' 
      });
    }

    const session = await CodeSession.create({
      code,
      language,
      title,
      userId
    });
    
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all sessions by user
exports.getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await CodeSession.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single code session
exports.getSession = async (req, res) => {
  try {
    const session = await CodeSession.findByPk(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a code session
exports.updateSession = async (req, res) => {
  try {
    const { code, language, title } = req.body;
    const session = await CodeSession.findByPk(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    await session.update({
      code,
      language,
      title
    });
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Execute code
exports.executeCode = async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ 
        message: 'Both code and language are required' 
      });
    }

    // Validate supported languages
    const supportedLanguages = ['javascript', 'python', 'java'];
    if (!supportedLanguages.includes(language.toLowerCase())) {
      return res.status(400).json({ 
        message: `Language not supported. Supported languages are: ${supportedLanguages.join(', ')}` 
      });
    }

    // Mock execution based on language
    let output;
    switch(language.toLowerCase()) {
      case 'javascript':
        output = `JavaScript output: ${code.length} characters of code processed`;
        break;
      case 'python':
        output = `Python output: ${code.length} characters of code processed`;
        break;
      case 'java':
        output = `Java output: ${code.length} characters of code processed`;
        break;
    }

    res.json({ 
      status: 'success',
      language,
      output,
      executionTime: '0.5s' // Mock execution time
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
};

// Delete a code session
exports.deleteSession = async (req, res) => {
  try {
    const session = await CodeSession.findByPk(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    await session.destroy();
    res.status(200).json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

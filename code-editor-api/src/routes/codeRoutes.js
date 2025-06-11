const express = require('express');
const router = express.Router();
const codeController = require('../controllers/codeController');
const { validateSession, validateCodeExecution } = require('../middleware/validation');

// Save a new code session
router.post('/code', validateSession, codeController.createSession);

// Get a specific code session by ID
router.get('/code/:id', codeController.getSession);

// Get all sessions by user
router.get('/code/user/:userId', codeController.getUserSessions);

// Update an existing code session
router.put('/code/:id', codeController.updateSession);

// Delete a code session
router.delete('/code/:id', codeController.deleteSession);

// Send code for execution and get output
router.post('/code/run', validateCodeExecution, codeController.executeCode);

module.exports = router;

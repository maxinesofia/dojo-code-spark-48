const express = require('express');
const { param } = require('express-validator');
const terminalController = require('../controllers/terminalController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all active terminal sessions
router.get('/sessions',
  authenticateToken,
  terminalController.getActiveTerminals
);

// Terminate a specific terminal session
router.delete('/sessions/:sessionId',
  authenticateToken,
  param('sessionId').isUUID().withMessage('Invalid session ID'),
  terminalController.terminateSession
);

module.exports = router;
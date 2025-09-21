const express = require('express');
const { body, param } = require('express-validator');
const executionController = require('../controllers/executionController');
const gcpExecutionController = require('../controllers/gcpExecutionController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Start project execution
router.post('/:projectId/start',
  authenticateToken,
  param('projectId').isUUID().withMessage('Invalid project ID'),
  executionController.startExecution
);

// Stop project execution
router.post('/:projectId/stop',
  authenticateToken,
  param('projectId').isUUID().withMessage('Invalid project ID'),
  executionController.stopExecution
);

// Get execution status
router.get('/:projectId/status',
  authenticateToken,
  param('projectId').isUUID().withMessage('Invalid project ID'),
  executionController.getExecutionStatus
);

// Update and restart execution
router.put('/:projectId/update',
  authenticateToken,
  param('projectId').isUUID().withMessage('Invalid project ID'),
  executionController.updateExecution
);

// Direct code execution without project (for quick runs) - no auth required
router.post('/run',
  body('files').isArray().withMessage('Files must be an array'),
  body('language').optional().isString().withMessage('Language must be a string'),
  body('timeout').optional().isNumeric().withMessage('Timeout must be a number'),
  executionController.runExecution
);

// List active executions (admin only)
router.get('/active',
  authenticateToken,
  // Add admin check middleware here if needed
  executionController.listActiveExecutions
);

// GCP Firecracker routes
router.post('/:projectId/gcp/start',
  authenticateToken,
  param('projectId').isUUID().withMessage('Invalid project ID'),
  gcpExecutionController.startExecution
);

router.post('/:projectId/gcp/stop',
  authenticateToken,
  param('projectId').isUUID().withMessage('Invalid project ID'),
  gcpExecutionController.stopExecution
);

router.get('/:projectId/gcp/status',
  authenticateToken,
  param('projectId').isUUID().withMessage('Invalid project ID'),
  gcpExecutionController.getExecutionStatus
);

router.put('/:projectId/gcp/update',
  authenticateToken,
  param('projectId').isUUID().withMessage('Invalid project ID'),
  gcpExecutionController.updateExecution
);

router.post('/:projectId/gcp/clone',
  authenticateToken,
  param('projectId').isUUID().withMessage('Invalid project ID'),
  body('sourceVmId').notEmpty().withMessage('Source VM ID is required'),
  gcpExecutionController.cloneExecution
);

router.get('/gcp/active',
  authenticateToken,
  gcpExecutionController.listActiveExecutions
);

module.exports = router;
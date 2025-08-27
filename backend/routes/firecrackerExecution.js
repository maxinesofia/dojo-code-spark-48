const express = require('express');
const { body } = require('express-validator');
const firecrackerService = require('../services/firecrackerServiceOfficial');

const router = express.Router();

// Execute code in Firecracker microVM
router.post('/run', [
  body('files').isArray().withMessage('Files must be an array'),
  body('language').isString().withMessage('Language must be specified'),
  body('timeout').optional().isNumeric().withMessage('Timeout must be numeric')
], async (req, res) => {
  try {
    const { files, language, timeout = 30000 } = req.body;

    console.log(`Executing ${language} code with ${files.length} files`);

    // Create file objects for Firecracker service
    const fileObjects = {};
    files.forEach(file => {
      fileObjects[file.name] = file.content;
    });

    // Execute code using Firecracker service
    const firecrackerServiceInstance = new firecrackerService();
    const result = await firecrackerServiceInstance.executeCode(
      fileObjects,
      language,
      timeout
    );

    res.json({
      success: result.success,
      output: result.output,
      stdout: result.output,
      stderr: result.error,
      error: result.success ? null : result.error,
      executionTime: result.executionTime,
      logs: result.logs || []
    });

  } catch (error) {
    console.error('Firecracker execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Execution failed',
      output: null,
      stderr: error.message
    });
  }
});

// Get execution status (for long-running processes)
router.get('/status/:vmId', async (req, res) => {
  try {
    const { vmId } = req.params;
    const firecrackerServiceInstance = new firecrackerService();
    const status = await firecrackerServiceInstance.getVMStatus(vmId);
    
    res.json({ status });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to get execution status' });
  }
});

module.exports = router;

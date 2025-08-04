const express = require('express');
const gcpFirecrackerService = require('../services/gcpFirecrackerService');

const router = express.Router();

// Quick code execution endpoint (no authentication for testing)
router.post('/execute', async (req, res) => {
  try {
    const { files, language = 'javascript', options = {} } = req.body;

    if (!files || typeof files !== 'object') {
      return res.status(400).json({ 
        error: 'Invalid request: files object is required' 
      });
    }

    console.log('Executing code:', { language, fileCount: Object.keys(files).length });

    // Execute code in Firecracker VM
    const result = await gcpFirecrackerService.executeCode(files, language);

    res.json({
      success: true,
      output: result.output,
      error: result.error,
      executionTime: result.executionTime,
      vmId: result.vmId
    });

  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({ 
      error: 'Execution failed',
      details: error.message 
    });
  }
});

// VM status endpoint
router.get('/:vmId/status', async (req, res) => {
  try {
    const { vmId } = req.params;
    const status = await gcpFirecrackerService.getVMStatus(vmId);
    res.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: 'Failed to get VM status',
      details: error.message 
    });
  }
});

// Stop VM endpoint
router.post('/:vmId/stop', async (req, res) => {
  try {
    const { vmId } = req.params;
    await gcpFirecrackerService.cleanupVM(vmId);
    res.json({ message: 'VM stopped successfully' });
  } catch (error) {
    console.error('Stop VM error:', error);
    res.status(500).json({ 
      error: 'Failed to stop VM',
      details: error.message 
    });
  }
});

// List active VMs
router.get('/active', async (req, res) => {
  try {
    const activeVMs = await gcpFirecrackerService.listActiveVMs();
    res.json({
      count: activeVMs.length,
      vms: activeVMs
    });
  } catch (error) {
    console.error('List VMs error:', error);
    res.status(500).json({ 
      error: 'Failed to list active VMs',
      details: error.message 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Firecracker Execution Service',
    timestamp: new Date().toISOString(),
    vmCount: gcpFirecrackerService.activeVMs ? gcpFirecrackerService.activeVMs.size : 0
  });
});

module.exports = router;
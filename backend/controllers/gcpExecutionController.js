const gcpFirecrackerService = require('../services/gcpFirecrackerService');
const { Project, File } = require('../models');
const { validationResult } = require('express-validator');

class GCPExecutionController {
  
  async startExecution(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;
      const userId = req.user.id;

      // Find project and verify ownership
      const project = await Project.findOne({
        where: { id: projectId, userId },
        include: [File]
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if already running
      if (project.executionStatus === 'running') {
        return res.status(400).json({ 
          error: 'Project is already running',
          vmId: project.executionId 
        });
      }

      // Prepare files for execution
      const files = {};
      project.Files.forEach(file => {
        files[file.name] = file.content;
      });

      // Detect language based on files
      const language = this.detectLanguage(project.Files);

      // Start GCP Firecracker execution
      const result = await gcpFirecrackerService.executeCode(files, language);

      // Update project status
      await project.update({
        executionStatus: 'running',
        executionId: result.vmId,
        executionUrl: `http://34.75.79.84:8080/${result.vmId}`, // Your GCP VM IP
        lastExecuted: new Date()
      });

      res.json({
        message: 'Execution started successfully',
        vmId: result.vmId,
        executionUrl: project.executionUrl,
        output: result.output,
        executionTime: result.executionTime
      });

    } catch (error) {
      console.error('Execution start error:', error);
      res.status(500).json({ 
        error: 'Failed to start execution',
        details: error.message 
      });
    }
  }

  async stopExecution(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;
      const userId = req.user.id;

      const project = await Project.findOne({
        where: { id: projectId, userId }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.executionStatus !== 'running' || !project.executionId) {
        return res.status(400).json({ error: 'No active execution found' });
      }

      // Stop GCP Firecracker VM
      await gcpFirecrackerService.cleanupVM(project.executionId);

      // Update project status
      await project.update({
        executionStatus: 'stopped',
        executionId: null,
        executionUrl: null
      });

      res.json({
        message: 'Execution stopped successfully'
      });

    } catch (error) {
      console.error('Execution stop error:', error);
      res.status(500).json({ 
        error: 'Failed to stop execution',
        details: error.message 
      });
    }
  }

  async getExecutionStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;
      const userId = req.user.id;

      const project = await Project.findOne({
        where: { id: projectId, userId }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      let vmStatus = null;
      if (project.executionId) {
        vmStatus = await gcpFirecrackerService.getVMStatus(project.executionId);
      }

      res.json({
        status: project.executionStatus,
        executionId: project.executionId,
        executionUrl: project.executionUrl,
        lastExecuted: project.lastExecuted,
        vmStatus
      });

    } catch (error) {
      console.error('Execution status error:', error);
      res.status(500).json({ 
        error: 'Failed to get execution status',
        details: error.message 
      });
    }
  }

  async updateExecution(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId } = req.params;
      const userId = req.user.id;

      const project = await Project.findOne({
        where: { id: projectId, userId },
        include: [File]
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Stop current execution if running
      if (project.executionStatus === 'running' && project.executionId) {
        await gcpFirecrackerService.cleanupVM(project.executionId);
      }

      // Start new execution with updated files
      const files = {};
      project.Files.forEach(file => {
        files[file.name] = file.content;
      });

      const language = this.detectLanguage(project.Files);
      const result = await gcpFirecrackerService.executeCode(files, language);

      // Update project
      await project.update({
        executionStatus: 'running',
        executionId: result.vmId,
        executionUrl: `http://34.75.79.84:8080/${result.vmId}`,
        lastExecuted: new Date()
      });

      res.json({
        message: 'Execution updated successfully',
        vmId: result.vmId,
        executionUrl: project.executionUrl,
        output: result.output,
        executionTime: result.executionTime
      });

    } catch (error) {
      console.error('Execution update error:', error);
      res.status(500).json({ 
        error: 'Failed to update execution',
        details: error.message 
      });
    }
  }

  async listActiveExecutions(req, res) {
    try {
      const activeVMs = await gcpFirecrackerService.listActiveVMs();
      
      res.json({
        count: activeVMs.length,
        executions: activeVMs
      });

    } catch (error) {
      console.error('List executions error:', error);
      res.status(500).json({ 
        error: 'Failed to list active executions',
        details: error.message 
      });
    }
  }

  async cloneExecution(req, res) {
    try {
      const { projectId } = req.params;
      const { sourceVmId } = req.body;
      const userId = req.user.id;

      const project = await Project.findOne({
        where: { id: projectId, userId }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Clone the VM (CodeSandbox-like instant cloning)
      const cloneResult = await gcpFirecrackerService.cloneVM(sourceVmId);

      // Update project with cloned VM
      await project.update({
        executionStatus: 'running',
        executionId: cloneResult.clonedVmId,
        executionUrl: `http://34.75.79.84:8080/${cloneResult.clonedVmId}`,
        lastExecuted: new Date()
      });

      res.json({
        message: 'VM cloned successfully',
        originalVmId: cloneResult.originalVmId,
        clonedVmId: cloneResult.clonedVmId,
        executionUrl: project.executionUrl,
        cloneTime: cloneResult.cloneTime
      });

    } catch (error) {
      console.error('VM clone error:', error);
      res.status(500).json({ 
        error: 'Failed to clone VM',
        details: error.message 
      });
    }
  }

  detectLanguage(files) {
    const fileExtensions = files.map(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      return ext;
    });

    if (fileExtensions.includes('jsx') || fileExtensions.includes('tsx') || 
        files.some(f => f.content.includes('react'))) {
      return 'react';
    }
    
    if (fileExtensions.includes('js') || fileExtensions.includes('ts')) {
      return 'javascript';
    }
    
    if (fileExtensions.includes('py')) {
      return 'python';
    }
    
    if (fileExtensions.includes('html')) {
      return 'html';
    }

    return 'javascript'; // default
  }
}

module.exports = new GCPExecutionController();
// Optional PTY manager: attempts to load node-pty; if unavailable, falls back.
let nodePty = null;
try {
  // Lazy require so installation is optional (esp. on Windows without build tools)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nodePty = require('node-pty');
} catch (e) {
  console.warn('[PTY] node-pty not available, falling back to plain spawn:', e.message);
}

function createPty(shell, args, options) {
  if (!nodePty) return null;
  try {
    const ptyProcess = nodePty.spawn(shell, args, {
      name: 'xterm-color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: options.cwd,
      env: options.env,
    });
    return ptyProcess;
  } catch (err) {
    console.error('[PTY] Failed to create PTY, fallback to spawn:', err);
    return null;
  }
}

function hasPtySupport() {
  return !!nodePty;
}

module.exports = { createPty, hasPtySupport };

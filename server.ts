import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // API: Run template with Python HiraTemplate Pro Max
  app.post('/api/run-template', (req, res) => {
    const { template, context } = req.body;
    const py = spawn('python3', [path.join(__dirname, 'engine_api.py')]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0 && !stdout) {
        return res.status(500).json({ success: false, error: stderr || `Python exited with code ${code}` });
      }
      try {
        const parsed = JSON.parse(stdout);
        res.json(parsed);
      } catch (err) {
        res.status(500).json({ success: false, error: stdout || stderr || 'Failed to parse engine response' });
      }
    });

    py.stdin.write(JSON.stringify({ action: 'render', template, context }));
    py.stdin.end();
  });

  // API: Run python main.py tests
  app.post('/api/run-tests', (req, res) => {
    const py = spawn('python3', [path.join(__dirname, 'main.py')]);

    let output = '';
    py.stdout.on('data', (data) => {
      output += data.toString();
    });
    py.stderr.on('data', (data) => {
      output += data.toString();
    });

    py.on('close', (code) => {
      res.json({
        success: code === 0,
        output,
        exitCode: code,
      });
    });
  });

  // API: Get all engine files content and line counts
  app.get('/api/engine-files', (req, res) => {
    const fileList = [
      'engine/__init__.py',
      'engine/lexer.py',
      'engine/parser.py',
      'engine/renderer.py',
      'engine/filters.py',
      'engine/exceptions.py',
      'hira_template/__init__.py',
      'pyproject.toml',
      'setup.py',
      'main.py',
      'templates/hello.html',
      'templates/base.html',
      'templates/header.html'
    ];

    const results = fileList.map((relPath) => {
      const fullPath = path.join(__dirname, relPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n').length;
        return {
          path: relPath,
          content,
          lines,
          exists: true
        };
      }
      return { path: relPath, content: '', lines: 0, exists: false };
    });

    res.json({ files: results });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HiraTemplate Pro Max server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

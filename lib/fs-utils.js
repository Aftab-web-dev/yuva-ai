const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function listFiles(dir, pattern = null) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = entries.filter(e => e.isFile()).map(e => e.name);
  if (pattern) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const regex = new RegExp(escaped);
    files = files.filter(f => regex.test(f));
  }
  return files;
}

function getProjectRoot() {
  return process.cwd();
}

function getTemplateDir() {
  return path.join(__dirname, '..', 'template');
}

function getPackageDir() {
  return path.join(__dirname, '..');
}

/**
 * Collect source files matching extensions, using glob.
 * Replaces manual readdirSync walking in code-analyzer, graph-builder, etc.
 */
function collectSourceFiles(targetDir, { extensions = ['js','ts','jsx','tsx','py','go','rs','java'], maxDepth = 10 } = {}) {
  const extGlob = extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`;
  const pattern = `**/*.${extGlob}`;
  return globSync(pattern, {
    cwd: targetDir,
    absolute: true,
    nodir: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**', '**/.yuva/**', '**/__pycache__/**', '**/.venv/**'],
    maxDepth,
  });
}

/**
 * Walk source files and call a callback with (filePath, content).
 * Replaces manual walkDir functions in plugin-gates, security-scanner.
 */
function walkSourceFiles(targetDir, { extensions = ['js','ts','jsx','tsx'], dirs = null, callback }) {
  const srcDirs = dirs || ['.'];
  const extGlob = extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`;
  for (const dir of srcDirs) {
    const fullDir = path.join(targetDir, dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = globSync(`**/*.${extGlob}`, {
      cwd: fullDir,
      absolute: true,
      nodir: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
      maxDepth: 6,
    });
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        callback(filePath, content);
      } catch {}
    }
  }
}

module.exports = { copyDir, ensureDir, readJSON, writeJSON, fileExists, readFile, writeFile, listFiles, getProjectRoot, getTemplateDir, getPackageDir, collectSourceFiles, walkSourceFiles };

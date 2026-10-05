const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

test('AssignTrack required files exist', () => {
    assert.strictEqual(fs.existsSync('index.html'), true);
    assert.strictEqual(fs.existsSync('styles.css'), true);
    assert.strictEqual(fs.existsSync('app.js'), true);
    assert.strictEqual(fs.existsSync('server.js'), true);
});

test('package.json contains start script', () => {
    const packageFile = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    assert.strictEqual(typeof packageFile.scripts.start, 'string');
    assert.strictEqual(packageFile.scripts.start, 'node server.js');
});
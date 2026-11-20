import { strict as assert } from 'assert';
import { JSDOM } from 'jsdom';
import { spawn } from 'child_process';

const PORT = process.env.ASHRAM_PORT || 8765;
const BASE_URL = `http://localhost:${PORT}`;

document.title = 'Test: Cooperative Counsel Link';

describe('Cooperative Page', () => {
  let server = null;

  before(async () => {
    server = spawn('node', ['commons/server.mjs'], { detached: true, env: { ...process.env, ASHRAM_PORT: PORT } });
    server.stdout.on('data', (data) => console.log(`stdout: ${data}`));
    server.stderr.on('data', (data) => console.error(`stderr: ${data}`));
    await new Promise(resolve => setTimeout(resolve, 3000)); // Give server time to start
  });

  after(() => {
    if (server) {
      process.kill(-server.pid);
    }
  });

  it('should contain the link to Awen\'s counsel questions', async () => {
    const response = await fetch(`${BASE_URL}/cooperative`);
    assert.equal(response.status, 200, `/cooperative should return 200`);
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const linkElement = doc.querySelector('a[href="https://github.com/cohabitation-project/workspace/blob/main/council/formation/AWEN-COUNSEL-QUESTIONS-v0.1.md"]');
    assert.ok(linkElement, 'Link to Awen\'s counsel questions should be present');
    assert.ok(linkElement.textContent.includes('Awen\'s list of questions for counsel'), 'Link text should include \'Awen\'s list of questions for counsel\'.');
  });
});

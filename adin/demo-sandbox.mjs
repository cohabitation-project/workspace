#!/usr/bin/env node
/**
 * demo-sandbox.mjs — Demonstrates ADIN sandbox execution with a real container.
 *
 * What it does:
 *   1. Detects the container runtime (Docker or Podman)
 *   2. Ensures the sandbox image is ready
 *   3. Creates a sandboxed container with resource limits
 *   4. Runs a simple node script inside the container
 *   5. Shows isolation (no network, no host filesystem)
 *   6. Cleans up the container
 *
 * Usage:
 *   ADIN_DEMO_SANDBOX=1 node adin/demo-sandbox.mjs
 *
 * Requires Docker or Podman.
 */

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

import { detectRuntime, ensureImage, createSandbox } from './sandbox.mjs';
import { executeSandboxed, SandboxUnavailableError } from './sandbox-executor.mjs';

const execFile = promisify(execFileCb);

function log(msg) {
  console.log(`[demo-sandbox] ${msg}`);
}

async function main() {
  if (!process.env.ADIN_DEMO_SANDBOX) {
    console.log('Set ADIN_DEMO_SANDBOX=1 to run this demo.');
    console.log('Example: ADIN_DEMO_SANDBOX=1 node adin/demo-sandbox.mjs');
    process.exit(0);
  }

  log('=== ADIN Sandbox Demo ===');
  log('');

  // 1. Detect runtime
  log('Step 1: Detecting container runtime...');
  const rt = await detectRuntime();
  if (!rt.available) {
    log('ERROR: No container runtime (Docker/Podman) found. Cannot run demo.');
    process.exit(1);
  }
  log(`  Runtime: ${rt.runtime} v${rt.version}`);
  log(`  Rootless: ${rt.rootless}`);
  log('');

  // 2. Ensure image
  log('Step 2: Ensuring sandbox image (may pull on first run)...');
  const image = await ensureImage(rt.runtime);
  log(`  Image: ${image}`);
  log('');

  // 3. Create work directory with test files
  const workDir = join('/tmp', `adin-demo-sandbox-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });

  writeFileSync(join(workDir, 'hello.test.mjs'), `
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('demo test', () => {
  it('adds numbers', () => {
    assert.equal(1 + 1, 2);
  });

  it('strings work', () => {
    assert.equal('hello'.toUpperCase(), 'HELLO');
  });

  it('arrays work', () => {
    assert.deepEqual([1, 2, 3].map(x => x * 2), [2, 4, 6]);
  });
});
`);

  writeFileSync(join(workDir, 'isolation-check.mjs'), `
import { readFileSync, readdirSync } from 'node:fs';
import http from 'node:http';

console.log('=== Sandbox Isolation Check ===');
console.log('');

// Check filesystem
console.log('[FS] Working directory:', process.cwd());
console.log('[FS] /work contents:', readdirSync('/work'));

try { readdirSync('/Users'); console.log('[FS] FAIL: /Users accessible!'); }
catch { console.log('[FS] OK: /Users not accessible'); }

try { readdirSync('/root/.ssh'); console.log('[FS] FAIL: /root/.ssh accessible!'); }
catch { console.log('[FS] OK: /root/.ssh not accessible'); }

try { readFileSync('/var/run/docker.sock'); console.log('[FS] FAIL: Docker socket accessible!'); }
catch { console.log('[FS] OK: Docker socket not accessible'); }

// Check network
await new Promise((resolve) => {
  const req = http.get('http://example.com', (res) => {
    console.log('[NET] FAIL: Network is accessible!');
    resolve();
  });
  req.on('error', () => {
    console.log('[NET] OK: Network is blocked');
    resolve();
  });
  req.setTimeout(2000, () => {
    console.log('[NET] OK: Network timed out (blocked)');
    req.destroy();
    resolve();
  });
});

// Check resources
console.log('[RES] Memory limit: check /sys/fs/cgroup/memory.max');
try {
  const limit = readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
  console.log('[RES] Memory max:', limit, 'bytes =', Math.round(parseInt(limit) / 1024 / 1024), 'MB');
} catch {
  try {
    const limit = readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim();
    console.log('[RES] Memory limit:', limit, 'bytes =', Math.round(parseInt(limit) / 1024 / 1024), 'MB');
  } catch {
    console.log('[RES] Could not read cgroup memory limit (may be cgroups v1 or restricted)');
  }
}

// Check PIDs
try {
  const pidsMax = readFileSync('/sys/fs/cgroup/pids.max', 'utf8').trim();
  console.log('[RES] PIDs max:', pidsMax);
} catch {
  console.log('[RES] Could not read pids.max');
}

console.log('');
console.log('=== Isolation Check Complete ===');
`);

  // 4. Run the sandbox
  log('Step 3: Creating sandbox container...');
  log(`  Work directory: ${workDir}`);
  log('  Limits: memory=512m, cpus=1, pids=128');
  log('  Network: none (execution phase)');
  log('');

  const sandbox = createSandbox({
    runtime: rt.runtime,
    image,
    workDir,
    limits: { memory: '512m', cpus: 1, pidsLimit: 128 },
    networkPhase: 'execution',
  });

  try {
    await sandbox.init();
    log(`  Container ID: ${sandbox.containerId}`);
    log(`  Container name: ${sandbox.id}`);
    log('');

    // Show container resource limits
    log('Step 4: Container resource limits (from docker inspect):');
    try {
      const { stdout: inspect } = await execFile(rt.runtime, [
        'inspect', sandbox.containerId,
        '--format', '  Memory: {{.HostConfig.Memory}} bytes\n  CPUs: {{.HostConfig.NanoCpus}} nanoCPUs\n  PIDs limit: {{.HostConfig.PidsLimit}}\n  Read-only root: {{.HostConfig.ReadonlyRootfs}}\n  Network: {{.HostConfig.NetworkMode}}\n  Privileged: {{.HostConfig.Privileged}}',
      ], { timeout: 10_000 });
      log(inspect);
    } catch {
      log('  (inspect format not supported)');
    }
    log('');

    // 5. Run isolation check
    log('Step 5: Running isolation check inside container...');
    log('--- container output start ---');
    try {
      const { stdout, stderr } = await execFile(rt.runtime, [
        'exec', sandbox.containerId, 'node', '/work/isolation-check.mjs',
      ], { timeout: 15_000 });
      console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (err) {
      console.log(err.stdout || '');
      if (err.stderr) console.error(err.stderr);
    }
    log('--- container output end ---');
    log('');

    // 6. Run the test
    log('Step 6: Running node --test inside container...');
    log('--- container output start ---');
    try {
      const { stdout, stderr } = await execFile(rt.runtime, [
        'exec', sandbox.containerId, 'node', '--test', '/work/hello.test.mjs',
      ], { timeout: 15_000 });
      console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (err) {
      console.log(err.stdout || '');
      if (err.stderr) console.error(err.stderr);
    }
    log('--- container output end ---');
    log('');

  } finally {
    // 7. Cleanup
    log('Step 7: Cleaning up container...');
    await sandbox.cleanup();
    log('  Container removed.');

    // Verify it's gone
    try {
      const { stdout } = await execFile(rt.runtime, [
        'ps', '-a', '--filter', `name=${sandbox.id}`, '--format', '{{.ID}}',
      ], { timeout: 5_000 });
      if (stdout.trim()) {
        log('  WARNING: Container still exists after cleanup!');
      } else {
        log('  Verified: container no longer exists.');
      }
    } catch { /* ok */ }

    rmSync(workDir, { recursive: true, force: true });
    log('  Work directory cleaned.');
  }

  log('');
  log('=== Demo Complete ===');
  log('');
  log('Summary:');
  log('  - Container created with enforced resource limits');
  log('  - Filesystem isolation: only /work mounted, root is read-only');
  log('  - Network isolation: --network=none blocks all external access');
  log('  - Process isolation: PID namespace + pids-limit');
  log('  - Container destroyed after task completion');
}

main().catch(err => {
  console.error('[demo-sandbox] Fatal error:', err.message);
  process.exit(1);
});

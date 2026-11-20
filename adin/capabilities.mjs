/**
 * capabilities.mjs — ADIN system detection for node workers.
 *
 * Detects hardware, OS, runtime, and container availability, returning a
 * capabilities object that matches the protocol schema (protocol.mjs).
 *
 * All detection is local — no network calls, no shell interpretation.
 * Uses the `os` module and `child_process.execFileSync` only.
 */

import os from 'node:os';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

/**
 * Detect system capabilities and return a protocol-compatible capabilities object.
 *
 * @param {object} [overrides] — optional overrides for offered/limits sections
 * @param {string[]} [overrides.task_types] — task types this node offers
 * @param {number}   [overrides.max_concurrent] — max concurrent tasks (default 1)
 * @param {number}   [overrides.max_task_duration_s] — max task duration in seconds
 * @param {object}   [overrides.limits] — additional owner-imposed limits
 * @returns {object} capabilities object matching the protocol schema
 */
export function detectCapabilities(overrides = {}) {
  const cpu = detectCPU();
  const ram = detectRAM();
  const disk = detectDisk();
  const runtime = detectRuntime();

  return {
    compute: {
      cpu,
      ram_gb: ram.total_gb,
      gpu: [], // GPU detection not implemented — always empty for now
    },
    storage: {
      total_gb: disk.total_gb,
      free_gb: disk.free_gb,
    },
    runtime,
    offered: {
      task_types: overrides.task_types || ['compute.build-test'],
      max_concurrent: overrides.max_concurrent || 1,
    },
    limits: {
      max_task_duration_s: overrides.max_task_duration_s || 600,
      ...(overrides.limits || {}),
    },
  };
}

/**
 * Detect current system load for heartbeat reporting.
 * @returns {{ cpu_percent: number, ram_used_gb: number, disk_free_gb: number, temp_c: number|null }}
 */
export function detectLoad() {
  const ram = detectRAM();
  const disk = detectDisk();
  const temp = detectTemperature();

  // CPU load: use os.loadavg() 1-min average as a percentage of cores
  const loadAvg = os.loadavg()[0];
  const cores = os.cpus().length || 1;
  const cpu_percent = Math.min(100, Math.round((loadAvg / cores) * 100));

  return {
    cpu_percent,
    ram_used_gb: Math.round((ram.total_gb - ram.available_gb) * 100) / 100,
    disk_free_gb: disk.free_gb,
    temp_c: temp,
  };
}

// ---- Internal detectors ----

function detectCPU() {
  const cpus = os.cpus();
  return {
    model: cpus.length > 0 ? cpus[0].model : 'unknown',
    cores: cpus.length || 1,
    threads: cpus.length || 1, // os.cpus() returns one entry per logical CPU
    arch: os.arch(),
  };
}

function detectRAM() {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    total_gb: Math.round((total / (1024 ** 3)) * 100) / 100,
    available_gb: Math.round((free / (1024 ** 3)) * 100) / 100,
  };
}

function detectDisk() {
  try {
    if (process.platform === 'win32') {
      // wmic logicaldisk get size,freespace — parse the C: drive
      const out = execFileSync('wmic', ['logicaldisk', 'get', 'size,freespace'], {
        timeout: 5000, encoding: 'utf8',
      });
      const lines = out.trim().split('\n').slice(1);
      if (lines.length > 0) {
        const parts = lines[0].trim().split(/\s+/);
        if (parts.length >= 2) {
          const free = parseInt(parts[0], 10);
          const total = parseInt(parts[1], 10);
          return {
            total_gb: Math.round((total / (1024 ** 3)) * 100) / 100,
            free_gb: Math.round((free / (1024 ** 3)) * 100) / 100,
          };
        }
      }
    } else {
      // Unix: df -k / (kilobytes)
      const out = execFileSync('df', ['-k', '/'], { timeout: 5000, encoding: 'utf8' });
      const lines = out.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        // df -k output: Filesystem 1K-blocks Used Available Use% Mounted
        if (parts.length >= 4) {
          const totalKB = parseInt(parts[1], 10);
          const availKB = parseInt(parts[3], 10);
          return {
            total_gb: Math.round((totalKB / (1024 ** 2)) * 100) / 100,
            free_gb: Math.round((availKB / (1024 ** 2)) * 100) / 100,
          };
        }
      }
    }
  } catch {
    // Disk detection failed — return zeros
  }
  return { total_gb: 0, free_gb: 0 };
}

function detectRuntime() {
  const runtime = {
    node: process.version.replace(/^v/, ''),
    platform: process.platform,
  };

  // Check for container runtimes
  for (const [name, cmd] of [['podman', 'podman'], ['docker', 'docker']]) {
    try {
      const out = execFileSync(cmd, ['--version'], { timeout: 5000, encoding: 'utf8' });
      if (out) {
        runtime[name] = out.trim().split('\n')[0];
        break; // prefer podman over docker if both exist
      }
    } catch {
      // not available
    }
  }

  return runtime;
}

/**
 * Read temperature from /sys/class/thermal on Linux.
 * Returns degrees Celsius or null on unsupported platforms.
 */
function detectTemperature() {
  if (process.platform !== 'linux') return null;
  try {
    const zones = fs.readdirSync('/sys/class/thermal');
    for (const zone of zones) {
      if (!zone.startsWith('thermal_zone')) continue;
      const tempFile = `/sys/class/thermal/${zone}/temp`;
      try {
        const raw = fs.readFileSync(tempFile, 'utf8').trim();
        const millideg = parseInt(raw, 10);
        if (!isNaN(millideg)) return Math.round(millideg / 1000);
      } catch {
        continue;
      }
    }
  } catch {
    // /sys/class/thermal not available
  }
  return null;
}

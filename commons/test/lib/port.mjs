// A port the OS says is free right now. Tests used to pick 5000 + random(90); two test files (or a leftover server)
// could land on the same port, and the test then talked to the wrong server: the flaky "Checkout wiring" failure
// (Claude's deploy-gate check, 2026-11-16).
import net from 'node:net';
export const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.on('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

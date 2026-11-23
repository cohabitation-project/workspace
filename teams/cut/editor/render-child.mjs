// Child process for POST /api/cut/render: runs renderEditJob (which uses spawnSync) OFF the server's event loop.
// Started by forkRenderJob in wire.mjs. Gets the job over IPC, answers once, exits.
import { renderEditJob } from "./render-job.mjs";

process.once("message", (job) => {
	let out;
	try { out = { ok: true, result: renderEditJob(job) }; }
	catch (e) { out = { ok: false, name: String(e?.name || "Error"), message: String(e?.message || e) }; }
	process.send(out, () => process.exit(0));
});

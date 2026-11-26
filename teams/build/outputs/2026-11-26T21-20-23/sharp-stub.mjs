// shape-only stand-in: this sandbox has no native sharp; not exercised by the curated-guard test.
function sharp(){ throw new Error('sharp stub: not available in this sandbox'); }
sharp.cache = () => {}; sharp.concurrency = () => {};
export default sharp;

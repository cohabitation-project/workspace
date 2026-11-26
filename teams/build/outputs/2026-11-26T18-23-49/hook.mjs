import { registerHooks } from 'node:module';
const STUB=new URL('./sharp-stub.mjs',import.meta.url).href;
registerHooks({resolve(s,c,n){if(s==='sharp')return{url:STUB,shortCircuit:true};return n(s,c);}});

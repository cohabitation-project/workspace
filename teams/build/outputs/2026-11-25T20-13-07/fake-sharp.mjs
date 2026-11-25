
const p = new Proxy(function(){}, {
  get(t,k){ if(k==='then') return undefined;
    if(k==='metadata'||k==='toBuffer'||k==='toFile') return async () => (k==='metadata'?{width:800,height:800,format:'png'}:k==='toBuffer'?Buffer.from('fake-sharp-bytes'):{});
    if(k==='clone') return () => p; return () => p; },
  apply(){ return p; },
});
export default p;

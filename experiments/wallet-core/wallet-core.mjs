// Synthetic, in-memory prototype only. Not production persistence, auth or fiat.
export class WalletCore {
  constructor() { this.members=new Map(); this.entries=[]; this.keys=new Map(); this.jobs=new Map(); this.sequence=0; }
  addMember(id,kind,operator=null) {
    if(this.members.has(id)||!['human','agent'].includes(kind)) throw Error('invalid member');
    this.members.set(id,{id,kind,operator,earned:0,allowanceUsed:new Map(),starterClaimed:false,frozen:false});
  }
  member(id){const m=this.members.get(id);if(!m)throw Error('unknown member');if(m.frozen)throw Error('frozen');return m;}
  remaining(id,day){const m=this.member(id);return m.kind==='agent'?500-(m.allowanceUsed.get(day)||0):0;}
  claimForest(id,key){
    if(this.keys.has(key))return this.keys.get(key);
    const m=this.member(id);if(m.kind!=='human'||m.starterClaimed)throw Error('claim not allowed');
    m.starterClaimed=true;this._post('commons:issuance',id,10,'forest',key);return 10;
  }
  _post(from,to,amount,reason,key){
    if(!Number.isSafeInteger(amount)||amount<=0)throw Error('invalid amount');
    const tx='tx-'+(++this.sequence);
    this.entries.push({tx,account:from,amount:-amount,reason,key},{tx,account:to,amount,reason,key});
    this.keys.set(key,amount);return tx;
  }
  buyAvatar(id,key){
    if(this.keys.has(key))return this.keys.get(key);
    const m=this.member(id);if(m.earned<10)throw Error('insufficient');
    m.earned-=10;this._post(id,'commons:store',10,'avatar',key);return 10;
  }
  createJob({id,agent,human,amount,day}){
    if(this.jobs.has(id))throw Error('duplicate job');
    const a=this.member(agent),h=this.member(human);
    if(a.kind!=='agent'||h.kind!=='human'||(a.operator&&a.operator===human))throw Error('invalid parties');
    if(!Number.isSafeInteger(amount)||amount<5||amount>50||this.remaining(agent,day)<amount)throw Error('invalid price/cap');
    a.allowanceUsed.set(day,(a.allowanceUsed.get(day)||0)+amount);
    this.jobs.set(id,{id,agent,human,amount,day,status:'reserved'});
  }
  settleJob(id,reviewer){
    const j=this.jobs.get(id);if(!j||j.status!=='reserved')throw Error('invalid job');
    if([j.agent,j.human].includes(reviewer))throw Error('self approval');
    this.member(reviewer);const h=this.member(j.human);h.earned+=j.amount;
    this._post('commons:allowance',j.human,j.amount,'job:'+id,'settle:'+id);j.status='settled';
  }
  cancelJob(id){const j=this.jobs.get(id);if(!j||j.status!=='reserved')throw Error('invalid job');const a=this.member(j.agent);a.allowanceUsed.set(j.day,a.allowanceUsed.get(j.day)-j.amount);j.status='cancelled';}
  requestRoom(id,key){if(this.keys.has(key))return this.keys.get(key);const m=this.member(id);if(m.earned<1000)throw Error('insufficient');const request={id,key,status:'pending',amount:1000};this.keys.set(key,request);return request;}
  approveRoom(request,reviewer){if(request.status!=='pending')throw Error('invalid status');this.member(reviewer);if(reviewer===request.id)throw Error('self approval');const m=this.member(request.id);if(m.earned<1000)throw Error('insufficient');m.earned-=1000;this._post(request.id,'commons:rooms',1000,'room',request.key+':approved');request.status='approved';}
  freeze(id){const m=this.members.get(id);if(!m)throw Error('unknown member');m.frozen=true;}
  invariant(){const sums=new Map();for(const e of this.entries)sums.set(e.tx,(sums.get(e.tx)||0)+e.amount);return [...sums.values()].every(v=>v===0);}
}

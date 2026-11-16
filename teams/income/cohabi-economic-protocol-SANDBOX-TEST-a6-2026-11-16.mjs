/**
 * CEP v0.1 sandbox ONLY: no network, no persistence, no Stripe, no auth, no monetary value.
 * Deliberately separate from production R ledger. A deterministic executable
 * demonstration of idempotent, balanced service-credit transitions.
 * No actual credits are offered; all identifiers synthetic.
 */
import assert from 'node:assert/strict';

class Simulation {
  constructor() {
    this.book = new Map([['issuance',0],['redeemed',0]]);
    this.keys = new Set();
    this.events = [];
  }
  balance(k) { return this.book.get(k) || 0; }
  post(key, type, lines, data={}) {
    if (this.keys.has(key)) return false;
    if (!key || lines.reduce((sum,l)=>sum+l[1],0)!==0) throw Error('unbalanced/invalid entry');
    for(const [account,amount] of lines) {
      if(!Number.isSafeInteger(amount))throw Error('integer credits only');
      if(account.startsWith('wallet:') && this.balance(account)+amount<0)throw Error('insufficient wallet credits');
    }
    for(const [account,amount] of lines)this.book.set(account,this.balance(account)+amount);
    this.keys.add(key);this.events.push({key,type,lines,data});return true;
  }
  paidTopup(user,units,paid,providerEvent) {
    if(!paid)throw Error('payment not confirmed');
    if(!Number.isSafeInteger(units)||units<=0)throw Error('units');
    return this.post('payment:'+providerEvent,'topup',[['issuance',-units],['wallet:'+user+':available',units]]);
  }
  reserve(user,order,units) {
    if(!Number.isSafeInteger(units)||units<=0)throw Error('units');
    return this.post('reserve:'+order,'reserve',[['wallet:'+user+':available',-units],['wallet:'+user+':reserved',units]],{user,order});
  }
  settle(user,order,units) {
    if(!this.keys.has('reserve:'+order))throw Error('not reserved');
    return this.post('settle:'+order,'settle',[['wallet:'+user+':reserved',-units],['redeemed',units]],{user,order});
  }
  cancel(user,order,units) {
    if(!this.keys.has('reserve:'+order))throw Error('not reserved');
    return this.post('cancel:'+order,'cancel',[['wallet:'+user+':reserved',-units],['wallet:'+user+':available',units]],{user,order});
  }
  save(user,key,units) {
    return this.post('save:'+user+':'+key,'save',[['wallet:'+user+':available',-units],['wallet:'+user+':savings',units]]);
  }
  unsave(user,key,units) {
    return this.post('unsave:'+user+':'+key,'unsave',[['wallet:'+user+':savings',-units],['wallet:'+user+':available',units]]);
  }
  balanced() {return [...this.book.values()].reduce((a,b)=>a+b,0)===0;}
}
function run() {
 const b=new Simulation();
 assert.throws(()=>b.paidTopup('p',2000,false,'e1'),/payment not confirmed/);
 assert.equal(b.paidTopup('p',2000,true,'e1'),true);
 for(let i=0;i<20;i++)assert.equal(b.paidTopup('p',2000,true,'e1'),false);
 assert.equal(b.balance('wallet:p:available'),2000);
 assert.equal(b.reserve('p','o1',700),true);
 assert.equal(b.reserve('p','o1',700),false);
 assert.equal(b.settle('p','o1',700),true);
 assert.equal(b.settle('p','o1',700),false);
 assert.equal(b.save('p','s1',800),true);
 assert.throws(()=>b.reserve('p','o2',600),/insufficient/);
 assert.equal(b.unsave('p','s2',200),true);
 assert.equal(b.reserve('p','o2',600),true);
 assert.equal(b.cancel('p','o2',600),true);
 assert.equal(b.balance('wallet:p:available'),700);
 assert.equal(b.balance('wallet:p:savings'),600);
 assert.equal(b.balance('wallet:p:reserved'),0);
 assert.equal(b.balance('redeemed'),700);
 assert.equal(b.balanced(),true);
 assert.throws(()=>b.post('bad','bad',[['x',2],['y',-1]]),/unbalanced/);
 console.log(JSON.stringify({status:'PASS',checks:'topup/20 replay, reserve, settle, savings, overdraft, cancel, double-entry',events:b.events.length,balances:Object.fromEntries(b.book)}));
}
run();

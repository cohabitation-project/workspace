import {DatabaseSync} from 'node:sqlite';
import {validateScene} from './scene.mjs';
// Isolated prototype only. Caller must supply a trusted, authenticated member ID.
export function sqliteStore(filename=':memory:') {
 const db=new DatabaseSync(filename);
 db.exec(`PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS personal_scenes (
 member_id TEXT PRIMARY KEY, revision INTEGER NOT NULL CHECK(revision>=1),
 payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
 const get=db.prepare('SELECT payload FROM personal_scenes WHERE member_id=?');
 const insert=db.prepare('INSERT OR IGNORE INTO personal_scenes(member_id,revision,payload) VALUES (?,1,?)');
 const update=db.prepare('UPDATE personal_scenes SET revision=revision+1,payload=?,updated_at=CURRENT_TIMESTAMP WHERE member_id=? AND revision=?');
 function validActor(id){if(typeof id!=='string'||!/^a_[a-z0-9]{3,64}$/.test(id))throw Error('invalid principal')}
 return {
  async get(id){validActor(id);const row=get.get(id);return row?JSON.parse(row.payload):null},
  async compareAndSwap(id,expected,scene){
   validActor(id); const s=validateScene(scene);
   if(expected===null){if(s.revision!==0)return null;const saved={...s,revision:1};return insert.run(id,JSON.stringify(saved)).changes===1?saved:null}
   if(!Number.isSafeInteger(expected)||expected<1||s.revision!==expected)return null;
   const saved={...s,revision:expected+1};
   return update.run(JSON.stringify(saved),id,expected).changes===1?saved:null;
  },
  close(){db.close()}
 };
}
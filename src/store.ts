import Dexie,{type EntityTable} from 'dexie';
import {createClient} from '@supabase/supabase-js';
import {defaults,type Item,type Settings} from './model';
export type Remote={id:string;user_id:string;kind:'item'|'settings';data:Item|Settings;version:number;deleted:boolean};
export type Row={key:string;id:string;owner:string;kind:'item'|'settings';data:Item|Settings;version:number;deleted:boolean;dirty:boolean;stamp:string;conflict?:Remote};
export const db=new Dexie('weekwise-v1') as Dexie & {records:EntityTable<Row,'key'>};
db.version(1).stores({records:'key,owner,[owner+id]'});
export const supabase=import.meta.env.VITE_SUPABASE_URL&&import.meta.env.VITE_SUPABASE_ANON_KEY?createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY):null;
export async function save(owner:string,kind:Row['kind'],id:string,data:Item|Settings,deleted=false){await db.transaction('rw',db.records,async()=>{const key=owner+':'+id;const old=await db.records.get(key);await db.records.put({...old,key,id,owner,kind,data,deleted,version:old?.version??0,dirty:true,stamp:crypto.randomUUID()});});}
export async function initialize(owner:string){if(!await db.records.get(owner+':settings'))await save(owner,'settings','settings',structuredClone(defaults));}
export async function acceptPush(snapshot:Row,remote:Remote){await db.transaction('rw',db.records,async()=>{const current=await db.records.get(snapshot.key);if(!current)return;await db.records.put({...current,version:remote.version,dirty:current.stamp!==snapshot.stamp,conflict:undefined});});}
export async function applyRemote(owner:string,remote:Remote){await db.transaction('rw',db.records,async()=>{const key=owner+':'+remote.id;const local=await db.records.get(key);if(local?.dirty||local?.conflict)return;if(local&&local.version>=remote.version)return;await db.records.put({key,id:remote.id,owner,kind:remote.kind,data:remote.data,version:remote.version,deleted:remote.deleted,dirty:false,stamp:crypto.randomUUID()});});}
let syncing=false;
export async function sync(owner:string){
 if(!supabase||owner==='guest'||!navigator.onLine||syncing)return;
 syncing=true;
 try{
  const rows=await db.records.where('owner').equals(owner).toArray();
  for(const row of rows.filter(r=>r.dirty&&!r.conflict)){
   const {data,error}=await supabase.rpc('save_record',{p_id:row.id,p_kind:row.kind,p_data:row.data,p_deleted:row.deleted,p_version:row.version});if(error)throw error;
   if(data.ok)await acceptPush(row,data.record);
   else await db.transaction('rw',db.records,async()=>{const current=await db.records.get(row.key);if(current)await db.records.put({...current,conflict:data.record});});
  }
  for(let offset=0;;offset+=500){const {data,error}=await supabase.from('planner_records').select('*').order('id').range(offset,offset+499);if(error)throw error;for(const r of data??[])await applyRemote(owner,r);if(!data||data.length<500)break;}
 }finally{syncing=false;}
}
export async function resolveConflict(row:Row,choice:'local'|'cloud'|'both'){
 const remote=row.conflict;if(!remote)return;
 await db.transaction('rw',db.records,async()=>{
  if(choice==='both'&&row.kind==='item'&&!row.deleted){const id=crypto.randomUUID();await save(row.owner,'item',id,{...row.data as Item,id,title:(row.data as Item).title+' (local copy)'});}
  await db.records.put({...row,data:choice==='local'?row.data:remote.data,deleted:choice==='local'?row.deleted:remote.deleted,version:remote.version,dirty:choice==='local',conflict:undefined,stamp:crypto.randomUUID()});
 });
}

import {createClient} from '@supabase/supabase-js';
import {buildPushPayload} from '@block65/webcrypto-web-push';
import {defaults,occurrences,gentleTime,instant,type Item,type Settings} from '../src/model';
type Env={SUPABASE_URL:string;SUPABASE_SERVICE_ROLE_KEY:string;VAPID_PUBLIC_KEY:string;VAPID_PRIVATE_KEY:string;VAPID_SUBJECT:string};
export function safeEndpoint(endpoint:string){try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&(u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname.endsWith('.push.services.mozilla.com')||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.notify.windows.com'));}catch{return false;}}
export function reminderTimes(i:Item,s:Settings,now:Date){
 if(i.done||i.reminder<0)return [];
 const dates=i.kind==='task'?(i.due?[new Date(+instant(i.due,i.zone)-i.reminder*60000)]:[]):occurrences(i,new Date(+now-2*86400000),new Date(+now+2*86400000)).map(o=>new Date(+o.start-i.reminder*60000));
 if(i.snoozedUntil)dates.push(new Date(i.snoozedUntil));
 return dates.map(d=>gentleTime(d,s)).filter(d=>Number.isFinite(+d)&&+d<=+now&&+d>+now-15*60000);
}
export async function deliver(env:Env,now=new Date()){
 const client=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const records:any[]=[];for(let offset=0;;offset+=500){const {data,error}=await client.from('planner_records').select('*').eq('deleted',false).order('user_id').order('id').range(offset,offset+499);if(error)throw error;records.push(...data);if(data.length<500)break;}
 const users=new Set(records.map(r=>r.user_id));
 for(const user of users){const prefs=records.find(r=>r.user_id===user&&r.kind==='settings');const s:Settings={...defaults,...prefs?.data};const {data:subscriptions,error}=await client.from('push_subscriptions').select('*').eq('user_id',user);if(error)throw error;
  for(const row of records.filter(r=>r.user_id===user&&r.kind==='item')){const item=row.data as Item;let times:Date[];try{times=reminderTimes(item,s,now);}catch{continue;}
   for(const due of times)for(const sub of subscriptions??[]){if(!safeEndpoint(sub.endpoint))continue;const key=sub.id+':'+row.id+':'+due.toISOString();const {data:claimed,error}=await client.rpc('claim_push',{p_key:key});if(error)throw error;if(!claimed)continue;
    try{const payload=await buildPushPayload({data:JSON.stringify({title:item.title,body:'A gentle reminder from your planner. Tap to view or snooze.',tag:key,url:'/?reminder='+encodeURIComponent(row.id)}),options:{ttl:900}},sub.subscription,{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY});const result=await fetch(sub.endpoint,{...payload,body:new Uint8Array(payload.body).buffer,redirect:'error'});
     if(result.ok){const {error}=await client.from('push_deliveries').update({delivered:true}).eq('key',key);if(error)throw error;}
     else if(result.status===404||result.status===410){const {error}=await client.from('push_subscriptions').delete().eq('id',sub.id);if(error)throw error;}
     else console.error('Push rejected',result.status);
    }catch(error){console.error('Push attempt failed',error instanceof Error?error.name:'Error');}
   }
  }
 }
 const {error}=await client.from('push_deliveries').delete().lt('claimed_at',new Date(+now-14*86400000).toISOString());if(error)throw error;
}
export default {async scheduled(_controller:unknown,env:Env){await deliver(env);},fetch(){return new Response('Weekwise reminder worker. Scheduling is handled by cron.',{headers:{'content-type':'text/plain'}});}};

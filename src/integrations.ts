import ICAL from 'ical.js';
import {PublicClientApplication} from '@azure/msal-browser';
import {DateTime} from 'luxon';
import {newItem,type Item,wall} from './model';
import {db,save,supabase} from './store';
declare global {interface Window {google?:any}}
let googleReady:Promise<void>|undefined;
export function prepareGoogle(){if(!import.meta.env.VITE_GOOGLE_CLIENT_ID)return Promise.resolve();return googleReady??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.onload=()=>resolve();script.onerror=()=>reject(Error('Could not load Google. Check your connection.'));document.head.append(script);});}
const msal=import.meta.env.VITE_MICROSOFT_CLIENT_ID?new PublicClientApplication({auth:{clientId:import.meta.env.VITE_MICROSOFT_CLIENT_ID,authority:'https://login.microsoftonline.com/common',redirectUri:location.origin+'/auth.html'},cache:{cacheLocation:'sessionStorage'}}):null;
export const prepareMicrosoft=()=>msal?.initialize();
export async function microsoftToken(scopes:string[]){if(!msal)throw Error('Microsoft connection needs setup. Follow START-HERE.md.');return (await msal.acquireTokenPopup({scopes,prompt:'select_account'})).accessToken;}
export function googleToken(scope:string):Promise<string>{if(!import.meta.env.VITE_GOOGLE_CLIENT_ID)throw Error('Google connection needs setup. Follow START-HERE.md.');if(!window.google)throw Error('Google is still loading or blocked. Try again in a moment.');return new Promise((resolve,reject)=>window.google.accounts.oauth2.initTokenClient({client_id:import.meta.env.VITE_GOOGLE_CLIENT_ID,scope,callback:(r:any)=>r.access_token?resolve(r.access_token):reject(Error(r.error||'Permission was not granted.')),error_callback:()=>reject(Error('Google connection was closed.'))}).requestAccessToken());}
const windowRange=()=>({from:DateTime.now().minus({days:30}).startOf('day').toJSDate(),to:DateTime.now().plus({years:1}).endOf('day').toJSDate()});
async function get(url:string,token:string){const r=await fetch(url,{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error('Calendar access failed ('+r.status+'). Reconnect and check calendar permissions.');return r.json();}
export async function importGoogle(owner:string,zone:string){
 if(!import.meta.env.VITE_GOOGLE_CLIENT_ID)throw Error('Google connection needs a client ID. Follow the Google section in START-HERE.md.');
 if(!window.google)throw Error('Google is still loading. Try again in a moment.');
 const token=await new Promise<string>((resolve,reject)=>window.google.accounts.oauth2.initTokenClient({client_id:import.meta.env.VITE_GOOGLE_CLIENT_ID,scope:'https://www.googleapis.com/auth/calendar.readonly',callback:(r:any)=>r.access_token?resolve(r.access_token):reject(Error(r.error||'Permission was not granted.')),error_callback:()=>reject(Error('Google connection was closed.'))}).requestAccessToken());
 const range=windowRange();const cal=await get('https://www.googleapis.com/calendar/v3/calendars/primary',token);const group='google:'+cal.id;let page='';const items:Item[]=[];
 do{const query=new URLSearchParams({timeMin:range.from.toISOString(),timeMax:range.to.toISOString(),singleEvents:'true',maxResults:'2500',...(page?{pageToken:page}:{})});const data=await get('https://www.googleapis.com/calendar/v3/calendars/primary/events?'+query,token);
 for(const e of data.items??[]){if(e.status==='cancelled')continue;const allDay=!!e.start.date;items.push({...newItem('event',zone),title:e.summary||'Untitled event',notes:e.description?.replace(/<[^>]*>/g,'')||'',location:e.location||'',allDay,start:allDay?e.start.date+'T00:00':wall(e.start.dateTime,zone),end:allDay?e.end.date+'T00:00':wall(e.end.dateTime,zone),source:'google',sourceGroup:group,sourceKey:e.id});}page=data.nextPageToken||'';}while(page);
 return reconcile(owner,items,group,range);
}
export async function importOutlook(owner:string,zone:string){
 if(!msal)throw Error('Outlook connection needs a Microsoft application ID. Follow START-HERE.md.');
 const auth=await msal.acquireTokenPopup({scopes:['Calendars.Read'],prompt:'select_account'});const range=windowRange();const group='outlook:'+auth.account?.homeAccountId;
 let url='https://graph.microsoft.com/v1.0/me/calendarView?'+new URLSearchParams({startDateTime:range.from.toISOString(),endDateTime:range.to.toISOString(),'$top':'1000'});const items:Item[]=[];
 while(url){if(!url.startsWith('https://graph.microsoft.com/'))throw Error('Unexpected calendar paging address.');const data=await get(url,auth.accessToken);for(const e of data.value??[]){if(e.isCancelled)continue;const utc=(v:string)=>/[Zz]|[+-]\d\d:\d\d$/.test(v)?v:v+'Z';items.push({...newItem('event',zone),title:e.subject||'Untitled event',notes:e.bodyPreview||'',location:e.location?.displayName||'',allDay:e.isAllDay,start:e.isAllDay?e.start.dateTime.slice(0,10)+'T00:00':wall(utc(e.start.dateTime),zone),end:e.isAllDay?e.end.dateTime.slice(0,10)+'T00:00':wall(utc(e.end.dateTime),zone),source:'outlook',sourceGroup:group,sourceKey:e.id});}url=data['@odata.nextLink']||'';}
 return reconcile(owner,items,group,range);
}
export function parseICS(text:string,zone:string,group:string,from:Date,to:Date){
 const root=new ICAL.Component(ICAL.parse(text));for(const c of root.getAllSubcomponents('vtimezone'))ICAL.TimezoneService.register(new ICAL.Timezone(c));
 const components=root.getAllSubcomponents('vevent');const exceptions=components.filter(c=>c.hasProperty('recurrence-id'));const result:Item[]=[];
 for(const component of components.filter(c=>!c.hasProperty('recurrence-id'))){if(component.getFirstPropertyValue('status')==='CANCELLED')continue;const event=new ICAL.Event(component);for(const exception of exceptions.filter(c=>c.getFirstPropertyValue('uid')===event.uid))event.relateException(new ICAL.Event(exception));const iterator=event.iterator();let scanned=0;
 while(true){const next=iterator.next();if(!next)break;if(++scanned>100000)throw Error('This calendar contains an excessively large recurrence. Import a smaller date range.');const detail=event.getOccurrenceDetails(next);const a=detail.startDate.toJSDate(),b=detail.endDate.toJSDate();if(a>=to)break;if(b<=from)continue;if(detail.item.component.getFirstPropertyValue('status')==='CANCELLED')continue;
 const asWall=(t:any)=>t.zone===ICAL.Timezone.localTimezone?t.toString().slice(0,16):wall(t.toJSDate().toISOString(),zone);
 result.push({...newItem('event',zone),title:detail.item.summary||'Untitled event',notes:detail.item.description||'',location:detail.item.location||'',allDay:detail.startDate.isDate,start:detail.startDate.isDate?detail.startDate.toString()+'T00:00':asWall(detail.startDate),end:detail.endDate.isDate?detail.endDate.toString()+'T00:00':asWall(detail.endDate),source:'ics',sourceGroup:group,sourceKey:event.uid+':'+next.toString()});if(result.length>20000)throw Error('Import is too large. Use a smaller calendar.');}
 }return result;
}
export async function importICS(owner:string,file:File,zone:string){if(file.size>5e6)throw Error('Choose an .ics file under 5 MB.');const range=windowRange(),group='ics:'+file.name;return reconcile(owner,parseICS(await file.text(),zone,group,range.from,range.to),group,range);}
export async function reconcile(owner:string,items:Item[],group:string,range:{from:Date;to:Date}){
 const old=(await db.records.where('owner').equals(owner).toArray()).filter(r=>r.kind==='item'&&(r.data as Item).sourceGroup===group);const keys=new Set(items.map(i=>i.sourceKey));
 await db.transaction('rw',db.records,async()=>{for(const item of items){const match=old.find(r=>(r.data as Item).sourceKey===item.sourceKey);const previous=match?.data as Item|undefined;const id=match?.id??item.id;await save(owner,'item',id,{...item,id,category:previous?.category??item.category,reminder:previous?.reminder??-1,travel:previous?.travel??0,buffer:previous?.buffer??0});}for(const row of old){const i=row.data as Item;const start=DateTime.fromISO(i.start,{zone:i.zone}).toJSDate();if(!keys.has(i.sourceKey)&&start>=range.from&&start<range.to)await save(owner,'item',row.id,i,true);}});return items.length;
}
export async function enablePush(owner:string){
 if(!supabase||owner==='guest')throw Error('Sign in to cloud sync first.');
 if(!import.meta.env.VITE_VAPID_PUBLIC_KEY)throw Error('The reminder service needs setup. See START-HERE.md.');
 if(!('serviceWorker' in navigator)||!('PushManager' in window))throw Error('On iPhone, add Weekwise to your Home Screen, open it there, then enable reminders.');
 if(await Notification.requestPermission()!=='granted')throw Error('Allow notifications in your device settings to receive reminders.');
 const registration=await navigator.serviceWorker.ready;const key=import.meta.env.VITE_VAPID_PUBLIC_KEY;const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const subscription=await registration.pushManager.getSubscription()??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
 const {error}=await supabase.from('push_subscriptions').upsert({user_id:owner,endpoint:subscription.endpoint,subscription:subscription.toJSON()},{onConflict:'user_id,endpoint'});if(error)throw error;return 'Notifications enabled on this device.';
}
export async function disablePush(owner:string){if(!('serviceWorker' in navigator))return;const reg=await navigator.serviceWorker.getRegistration();const sub=await reg?.pushManager.getSubscription();if(sub&&supabase&&owner!=='guest'){const {error}=await supabase.from('push_subscriptions').delete().eq('user_id',owner).eq('endpoint',sub.endpoint);if(error)throw error;await sub.unsubscribe();}}

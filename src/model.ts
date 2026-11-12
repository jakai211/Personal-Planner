import { DateTime } from 'luxon';
import {RRule} from 'rrule';
export type Category={id:string;name:string;color:string};
export type Settings={name:string;theme:'light'|'dark'|'auto';accent:string;fontSize:number;density:'comfortable'|'compact';weekStart:number;hour24:boolean;startHour:number;endHour:number;weekends:boolean;zone:string;categories:Category[];buffer:number;quietStart:number;quietEnd:number;quietEnabled:boolean};
export const defaults:Settings={name:'Weekwise',theme:'auto',accent:'#23796b',fontSize:14,density:'comfortable',weekStart:1,hour24:false,startHour:7,endHour:22,weekends:true,zone:'America/New_York',buffer:10,quietStart:22,quietEnd:7,quietEnabled:true,categories:[{id:'work',name:'Work',color:'#628bd0'},{id:'study',name:'Study',color:'#ab81cd'},{id:'personal',name:'Personal',color:'#5b9c77'}]};
export type Repeat={freq:'none'|'daily'|'weekly'|'monthly';interval:number;days:number[];until:string;count:number};
export type Item={id:string;kind:'task'|'event'|'block';title:string;notes:string;category:string;priority:number;start:string;end:string;zone:string;allDay:boolean;due:string;done:boolean;progress:number;subtasks:{id:string;title:string;done:boolean}[];reminder:number;repeat:Repeat;exceptions:string[];taskId?:string;location:string;buffer:number;travel:number;focus:boolean;snoozedUntil:string;source?:'google'|'outlook'|'ics';sourceKey?:string;sourceGroup?:string};
export const noRepeat:Repeat={freq:'none',interval:1,days:[],until:'',count:0};
export function newItem(kind:Item['kind']='event',zone=defaults.zone):Item{return {id:crypto.randomUUID(),kind,title:'',notes:'',category:'work',priority:2,start:'',end:'',zone,allDay:false,due:'',done:false,progress:0,subtasks:[],reminder:-1,repeat:{...noRepeat},exceptions:[],location:'',buffer:0,travel:0,focus:false,snoozedUntil:''};}
export function wall(iso:string,zone:string){return DateTime.fromISO(iso,{zone}).toFormat("yyyy-MM-dd'T'HH:mm");}
export function instant(value:string,zone:string){return DateTime.fromISO(value,{zone}).toJSDate();}
export type Occurrence={start:Date;end:Date;key:string};
export function occurrences(item:Item,from:Date,to:Date):Occurrence[]{
  if(!item.start || item.kind==='task')return [];
  const start=DateTime.fromISO(item.start,{zone:item.zone});
  const end=DateTime.fromISO(item.end,{zone:item.zone});
  const duration=end.toMillis()-start.toMillis();
  if(!start.isValid||!end.isValid||duration<=0)return [];
  let dates:Date[];
  if(item.repeat.freq==='none')dates=[start.toJSDate()];
  else {
    // Generate floating wall times, then resolve in the event zone to retain local time across DST.
    const float=(d:DateTime)=>new Date(d.toFormat("yyyy-MM-dd'T'HH:mm:ss")+'Z');
    const rule=new RRule({freq:{daily:RRule.DAILY,weekly:RRule.WEEKLY,monthly:RRule.MONTHLY}[item.repeat.freq],dtstart:float(start),interval:Math.max(1,item.repeat.interval),...(item.repeat.days.length&&item.repeat.freq==='weekly'?{byweekday:item.repeat.days}:{}),...(item.repeat.until?{until:new Date(item.repeat.until+'T23:59:59Z')}:{}),...(item.repeat.count?{count:item.repeat.count}:{})});
    const a=float(DateTime.fromJSDate(new Date(from.getTime()-duration-86400000),{zone:item.zone}));
    const b=float(DateTime.fromJSDate(new Date(to.getTime()+86400000),{zone:item.zone}));
    dates=rule.between(a,b,true).map(d=>DateTime.fromISO(d.toISOString().slice(0,19),{zone:item.zone}).toJSDate());
  }
  return dates.map(d=>({start:d,end:new Date(d.getTime()+duration),key:d.toISOString()})).filter(o=>o.start<to&&o.end>from&&!item.exceptions.includes(o.key));
}
export function progress(item:Item){return item.done?100:item.subtasks.length?Math.round(item.subtasks.filter(s=>s.done).length/item.subtasks.length*100):item.progress;}
export function inQuiet(date:Date,s:Settings){const h=DateTime.fromJSDate(date,{zone:s.zone}).hour;return s.quietEnabled&&(s.quietStart===s.quietEnd|| (s.quietStart<s.quietEnd?h>=s.quietStart&&h<s.quietEnd:h>=s.quietStart||h<s.quietEnd));}
export function gentleTime(date:Date,s:Settings){if(!inQuiet(date,s))return date;let d=DateTime.fromJSDate(date,{zone:s.zone}).set({hour:s.quietEnd,minute:0,second:0,millisecond:0});if(d.toMillis()<=date.getTime())d=d.plus({days:1});return d.toJSDate();}
export function findSlots(items:Item[],s:Settings,from:Date,minutes=30,limit=3){
 const end=DateTime.fromJSDate(from,{zone:s.zone}).plus({days:14}).toJSDate();
 const busy=items.filter(i=>!i.done).flatMap(i=>occurrences(i,from,end).map(o=>({a:o.start.getTime()-(i.travel||0)*60000,b:o.end.getTime()+(i.buffer||0)*60000})));
 const result:Date[]=[];let d=DateTime.fromJSDate(from,{zone:s.zone}).set({second:0,millisecond:0});d=d.plus({minutes:(15-d.minute%15)%15});if(d.toMillis()<from.getTime())d=d.plus({minutes:15});
 for(;d.toMillis()<end.getTime()&&result.length<limit;d=d.plus({minutes:15})){
 const a=d.toMillis(),b=a+minutes*60000,last=DateTime.fromMillis(b-1,{zone:s.zone});
 if(d.hour<s.startHour||last.hour>=s.endHour||last.day!==d.day||(!s.weekends&&d.weekday>5)||inQuiet(d.toJSDate(),s)||inQuiet(last.toJSDate(),s)||busy.some(x=>a<x.b&&b>x.a))continue;
 result.push(d.toJSDate());d=d.plus({minutes:minutes-15});
 }return result;
}
export function validateItem(i:Item){
 if(!i.title.trim()||i.title.length>250)throw Error('Add a title of 1–250 characters.');
 if(!DateTime.now().setZone(i.zone).isValid)throw Error('Choose a valid time zone.');
 if(i.kind!=='task'&&(!i.start||!i.end||instant(i.end,i.zone)<=instant(i.start,i.zone)))throw Error('End time must be after start time.');
 if(i.kind!=='task'&&(!DateTime.fromISO(i.start,{zone:i.zone}).isValid||!DateTime.fromISO(i.end,{zone:i.zone}).isValid))throw Error('Enter valid dates.');
 if(i.repeat.interval<1||i.repeat.interval>365||i.repeat.count<0||i.repeat.count>10000)throw Error('Check the repeat interval and count.');
 if(i.repeat.until&&i.repeat.until<i.start.slice(0,10))throw Error('Repeat end must be on or after the first event.');
}
export function parseBackup(text:string):{kind:'item'|'settings';id:string;data:Item|Settings}[]{
 const raw=JSON.parse(text);if(raw.format!=='weekwise-1'||!Array.isArray(raw.records)||raw.records.length>20000)throw Error('This is not a Weekwise backup.');
 return raw.records.map((r:{kind:string;id:string;data:any})=>{if(!r.id||!['item','settings'].includes(r.kind))throw Error('Invalid backup record.');if(r.kind==='item'){const d=r.data;if(!['task','event','block'].includes(d.kind)||!Array.isArray(d.subtasks)||!Array.isArray(d.exceptions)||!d.repeat||!Array.isArray(d.repeat.days))throw Error('Invalid planner item.');validateItem(d);}else{if(!Array.isArray(r.data.categories)||!DateTime.now().setZone(r.data.zone).isValid)throw Error('Invalid settings.');}return r;});
}

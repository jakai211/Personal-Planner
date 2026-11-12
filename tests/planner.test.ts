import 'fake-indexeddb/auto';
import {beforeEach,describe,it,expect} from 'vitest';
import {DateTime} from 'luxon';
import {defaults,newItem,occurrences,findSlots,gentleTime,parseBackup,validateItem} from '../src/model';
import {db,save,acceptPush,applyRemote,resolveConflict,type Remote} from '../src/store';
import {reminderTimes,safeEndpoint} from '../cloud/reminders';

describe('calendar and routines',()=>{
 it('keeps a recurring 9 AM meeting at 9 AM across spring DST',()=>{
  const item={...newItem(),title:'Standup',start:'2026-03-06T09:00',end:'2026-03-06T09:30',repeat:{freq:'daily' as const,interval:1,days:[],until:'2026-03-10',count:0}};
  const list=occurrences(item,new Date('2026-03-06T00:00Z'),new Date('2026-03-11T00:00Z'));
  expect(list).toHaveLength(5);expect(list.map(o=>DateTime.fromJSDate(o.start,{zone:item.zone}).hour)).toEqual([9,9,9,9,9]);
  expect(list[0].start.toISOString()).toBe('2026-03-06T14:00:00.000Z');expect(list[3].start.toISOString()).toBe('2026-03-09T13:00:00.000Z');
 });
 it('honors weekdays and occurrence exceptions',()=>{
  const i={...newItem(),title:'Routine',start:'2026-11-09T09:00',end:'2026-11-09T10:00',repeat:{freq:'weekly' as const,interval:1,days:[0,2,4],until:'',count:0},exceptions:['2026-11-11T14:00:00.000Z']};
  expect(occurrences(i,new Date('2026-11-09'),new Date('2026-11-16')).map(o=>o.start.toISOString())).toEqual(['2026-11-09T14:00:00.000Z','2026-11-13T14:00:00.000Z']);
 });
 it('finds time after occupied blocks and buffers, not during quiet hours',()=>{
  const s={...defaults,startHour:7,endHour:18,quietEnd:9};
  const item={...newItem(),title:'Work',start:'2026-11-12T09:00',end:'2026-11-12T10:00',buffer:30};
  const slots=findSlots([item],s,new Date('2026-11-12T12:00:00Z'),30,1);
  expect(slots[0].toISOString()).toBe('2026-11-12T15:30:00.000Z');
 });
 it('rejects negative duration and an invalid backup',()=>{
  expect(()=>validateItem({...newItem(),title:'Bad',start:'2026-11-12T10:00',end:'2026-11-12T09:00'})).toThrow();
  expect(()=>parseBackup('{"format":"other","records":[]}')).toThrow();
 });
});

describe('offline persistence and sync races',()=>{
 beforeEach(async()=>{await db.records.clear();});
 it('retains a new offline edit made while an older edit uploads',async()=>{
  const item={...newItem('task'),title:'First'};await save('a','item',item.id,item);const sent=(await db.records.get('a:'+item.id))!;
  await save('a','item',item.id,{...item,title:'Second'});
  await acceptPush(sent,{id:item.id,user_id:'a',kind:'item',data:item,version:1,deleted:false});
  const current=(await db.records.get(sent.key))!;expect(current.dirty).toBe(true);expect(current.version).toBe(1);expect((current.data as typeof item).title).toBe('Second');
 });
 it('never replaces a dirty local edit with a pulled cloud record',async()=>{
  const item={...newItem('task'),title:'Local'};await save('a','item',item.id,item);
  await applyRemote('a',{id:item.id,user_id:'a',kind:'item',data:{...item,title:'Remote'},version:2,deleted:false});
  expect(((await db.records.get('a:'+item.id))!.data as typeof item).title).toBe('Local');
 });
 it('keeps both versions when resolving a conflict and isolates accounts',async()=>{
  const item={...newItem('task'),title:'Local'};await save('a','item',item.id,item);
  const cloud:Remote={id:item.id,user_id:'a',kind:'item',data:{...item,title:'Cloud'},version:3,deleted:false};
  const row=(await db.records.get('a:'+item.id))!;await resolveConflict({...row,conflict:cloud},'both');
  expect(await db.records.where('owner').equals('a').count()).toBe(2);expect(await db.records.where('owner').equals('b').count()).toBe(0);
  expect(((await db.records.get(row.key))!.data as typeof item).title).toBe('Cloud');
 });
 it('persists deletion markers',async()=>{const item={...newItem('task'),title:'Removed'};await save('a','item',item.id,item,true);const row=await db.records.get('a:'+item.id);expect(row?.deleted).toBe(true);expect(row?.dirty).toBe(true);});
});

describe('gentle reminders',()=>{
 it('defers overnight reminders until the next quiet-hours end',()=>{expect(gentleTime(new Date('2026-11-13T04:30Z'),defaults).toISOString()).toBe('2026-11-13T12:00:00.000Z');});
 it('does not send for completed tasks or outside the catch-up window',()=>{const i={...newItem('task'),title:'Due',due:'2026-11-12T12:00',reminder:0};expect(reminderTimes(i,defaults,new Date('2026-11-12T17:05Z'))).toHaveLength(1);expect(reminderTimes({...i,done:true},defaults,new Date('2026-11-12T17:05Z'))).toHaveLength(0);expect(reminderTimes(i,defaults,new Date('2026-11-12T17:30Z'))).toHaveLength(0);});
 it('rejects push endpoint spoofing and private network destinations',()=>{expect(safeEndpoint('https://web.push.apple.com/Q/test')).toBe(true);expect(safeEndpoint('https://web.push.apple.com.evil.test/push')).toBe(false);expect(safeEndpoint('http://127.0.0.1/push')).toBe(false);expect(safeEndpoint('https://fcm.googleapis.com:444/push')).toBe(false);});
});

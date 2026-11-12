/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
declare const self: ServiceWorkerGlobalScope & {__WB_MANIFEST: Array<{url:string;revision:string|null}>};
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.addEventListener('push', event => {
  let data = {title:'Weekwise reminder',body:'Something on your planner is coming up.',tag:'weekwise',url:'/'};
  try { data = {...data,...event.data?.json()}; } catch { /* Use the default for malformed payloads. */ }
  const url=typeof data.url==='string'&&data.url.startsWith('/?reminder=')?data.url:'/';
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,tag:data.tag,icon:'/icon-192.png',badge:'/icon-192.png',data:{url}}));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async()=>{const url=new URL(event.notification.data?.url||'/',self.location.origin).href;const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const win of windows)if('focus' in win){await (win as WindowClient).navigate(url);await win.focus();return;}await self.clients.openWindow(url);})());
});

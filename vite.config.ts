import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({plugins:[react(),VitePWA({strategies:'injectManifest',srcDir:'src',filename:'sw.ts',registerType:'prompt',injectRegister:'auto',includeAssets:['icon-192.png','icon-512.png'],manifest:{id:'/',name:'Weekwise Planner',short_name:'Weekwise',description:'Your week, with room to breathe.',start_url:'/',display:'standalone',background_color:'#f7f8f5',theme_color:'#143c38',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]}})]});

import {createSnapshot} from './model.js';
export function createDataStore({fetcher=globalThis.fetch,baseUrl=new URL('./data/',import.meta.url),digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('')}={}){
 let current=null,version=null,pending=null;
 const listeners=new Set();
 const emit=status=>{for(const listener of listeners)listener(current,status);};
 const read=async (url,cache='no-store')=>{const response=await fetcher(url,{cache});if(!response.ok)throw Error(`Dataset request failed (${response.status}).`);return response;};
 async function refresh(){
  if(pending)return pending;
  pending=(async()=>{try{
   const pointer=await (await read(new URL('version.json?t='+Date.now(),baseUrl))).json();
   if(pointer.schemaVersion!==1||!/^snapshot\.[a-f0-9]{64}\.json$/.test(pointer.file)||pointer.file!==`snapshot.${pointer.version}.json`)throw Error('Invalid dataset version pointer.');
   if(pointer.version!==version){
    const raw=await (await read(new URL(pointer.file,baseUrl),'force-cache')).text();
    if(await digest(raw)!==pointer.version)throw Error('Dataset integrity check failed.');
    const next=createSnapshot(JSON.parse(raw));
    if(next.quality.errors.length)throw Error('Published dataset failed validation.');
    current=next;version=pointer.version;
    emit({state:'updated',version,checkedAt:new Date()});
   }else emit({state:'unchanged',version,checkedAt:new Date()});
   return current;
  }catch(error){emit({state:'error',version,message:error.message,checkedAt:new Date()});return current;}finally{pending=null;}})();
  return pending;
 }
 return {refresh,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},get current(){return current;}};
}
export const dataStore=createDataStore();
export function watchData(onSnapshot,onStatus){
 let last=null,timer;
 const unsubscribe=dataStore.subscribe((snapshot,status)=>{
  if(snapshot&&snapshot!==last){last=snapshot;onSnapshot(snapshot);clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)dataStore.refresh();},snapshot.config.refreshIntervalMs);}
  if(!timer)timer=setInterval(()=>{if(!document.hidden)dataStore.refresh();},60000);
  onStatus?.(snapshot,status);
 });
 const focus=()=>{if(!document.hidden)dataStore.refresh();};
 window.addEventListener('focus',focus);window.addEventListener('pageshow',focus);document.addEventListener('visibilitychange',focus);dataStore.refresh();
 return ()=>{unsubscribe();clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('pageshow',focus);document.removeEventListener('visibilitychange',focus);};
}

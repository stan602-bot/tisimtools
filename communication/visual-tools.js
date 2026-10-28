
(() => {
'use strict';
const mode = document.body.dataset.mode;
const KEY='conors-tisim-communication-library-v1';
const TYPES=['Needs','Feelings','Activities','Places','Food','People','Other'];
const starter=[
['I want','🙋','Needs'],['Help','🙌','Needs'],['Yes','✅','Needs'],['No','❌','Needs'],
['More','➕','Needs'],['Finished','🏁','Needs'],['Stop','🛑','Needs'],['Wait','✋','Needs'],
['Toilet','🚽','Needs'],['Drink','🥤','Needs'],['Break','🧘','Needs'],['Please','🙏','Needs'],
['Happy','😊','Feelings'],['Sad','😢','Feelings'],['Angry','😠','Feelings'],['Tired','😴','Feelings'],
['Worried','😟','Feelings'],['Excited','🤩','Feelings'],
['Play','🧸','Activities'],['Read','📖','Activities'],['Draw','🎨','Activities'],['Music','🎵','Activities'],
['Computer','💻','Activities'],['Wash hands','🧼','Activities'],['Go outside','🌳','Activities'],
['Classroom','🏫','Places'],['Playground','🛝','Places'],['Home','🏠','Places'],
['Lunch','🍽️','Food'],['Snack','🍎','Food'],['Hungry','🥪','Food'],
['Teacher','👩‍🏫','People'],['Friend','🧑‍🤝‍🧑','People'],['Mum','👩','People'],['Dad','👨','People']
];
const $=id=>document.getElementById(id);
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=()=>window.crypto&&window.crypto.randomUUID?window.crypto.randomUUID():'tile-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const defaults=()=>({version:1,tiles:starter.map((r,i)=>({id:'starter-'+i,label:r[0],emoji:r[1],category:r[2],image:''})),routine:[null,null,null]});
let state;
try {const raw=localStorage.getItem(KEY);state=raw?validate(JSON.parse(raw)):defaults()} catch(e){state=defaults();window.addEventListener('load',()=>notify('Browser storage is unavailable. Export a backup to keep changes.'))}
let sentence=[];
let activeSlot=0;
let editingId=null;
let isManaging=false;
let flashTimer=0;

function validate(obj){
 if(!obj||obj.version!==1||!Array.isArray(obj.tiles)||!Array.isArray(obj.routine)||obj.routine.length!==3||obj.tiles.length>160)throw Error('Invalid board backup.');
 const ids=new Set();
 const tiles=obj.tiles.map((t,i)=>{
  if(!t||typeof t.label!=='string'||!t.label.trim()||t.label.length>70||typeof t.id!=='string'||!t.id||t.id.length>120||ids.has(t.id))throw Error('A tile in the backup is invalid.');
  ids.add(t.id);
  if(typeof t.image!=='string'||t.image.length>350000||(t.image&&!/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i.test(t.image)))throw Error('A photo in the backup is invalid or too large.');
  const emoji=typeof t.emoji==='string'?t.emoji.slice(0,15):'🖼️';
  return {id:t.id,label:t.label.trim(),emoji,category:TYPES.includes(t.category)?t.category:'Other',image:t.image};
 });
 const routine=obj.routine.map(id=>id===null?null:typeof id==='string'&&ids.has(id)?id:null);
 return {version:1,tiles,routine};
}
function save(next){
 try{localStorage.setItem(KEY,JSON.stringify(next));state=next;return true}
 catch(e){notify('Could not save on this device. Try fewer photos or export a backup.');return false}
}
function notify(message){
 const el=$('feedback');el.textContent=message;el.hidden=false;
 clearTimeout(flashTimer);flashTimer=setTimeout(()=>{el.hidden=true},3900);
}
function node(tag,cls,txt){
 const el=document.createElement(tag);
 if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;
 return el;
}
function picture(tile){
 const wrap=node('span','picture');
 if(tile.image){
  const img=document.createElement('img');img.src=tile.image;img.alt='';wrap.append(img);
 }else{wrap.textContent=tile.emoji||'🖼️'}
 return wrap;
}
function byId(id){return state.tiles.find(t=>t.id===id)}
function readOut(words){
 if(!words)return notify('Choose a picture or word first.');
 if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window))return notify('Speech playback is not available in this browser.');
 try{speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(words);speech.lang='en-GB';speech.rate=.85;speechSynthesis.speak(speech)}
 catch(e){notify('Speech playback is unavailable on this device.')}
}
function buildTile(t){
 const frame=node('div','tile-frame');
 const button=node('button','tile');button.type='button';
 button.setAttribute('aria-label',t.label);
 button.append(picture(t),node('span','word',t.label));
 button.addEventListener('click',()=>{
  if(isManaging)return openEditor(t);
  if(mode==='routine'){
   const next=clone(state);next.routine[activeSlot]=t.id;
   if(save(next)){renderRoutine();notify(t.label+' selected for '+['Now','Then','After'][activeSlot])}
  } else {
   sentence.push(t.id);renderSentence();
  }
 });
 frame.append(button);
 if(isManaging){
  const edit=node('button','tile-edit','Edit');edit.type='button';edit.setAttribute('aria-label','Edit '+t.label);
  edit.addEventListener('click',()=>openEditor(t));frame.append(edit);
 }
 return frame;
}
function renderGrid(){
 const term=$('searchTiles').value.trim().toLowerCase();
 const cat=$('filterCategory').value;
 const grid=$('tileGrid');grid.replaceChildren();
 const filtered=state.tiles.filter(t=>(cat==='All'||t.category===cat)&&t.label.toLowerCase().includes(term));
 if(!filtered.length)grid.append(node('p','empty','No matching tiles. Add your own using + Add picture / word.'));
 filtered.forEach(t=>grid.append(buildTile(t)));
 $('tileTotal').textContent=String(filtered.length);
}
function renderSentence(){
 if(mode!=='talk')return;
 const strip=$('sentenceStrip');strip.replaceChildren();
 if(!sentence.length)strip.append(node('span','sentence-hint','Tap pictures below to build your message'));
 sentence.forEach((id,index)=>{
  const t=byId(id);if(!t)return;
  const chip=node('button','sentence-chip');chip.type='button';chip.title='Remove '+t.label;
  const mini=node('span','mini',t.image?'':t.emoji);if(t.image){const image=document.createElement('img');image.src=t.image;image.alt='';mini.append(image)}
  chip.append(mini,node('span',null,t.label));
  chip.addEventListener('click',()=>{sentence.splice(index,1);renderSentence()});
  strip.append(chip);
 });
 $('sentenceText').textContent=sentence.map(id=>byId(id)?.label||'').filter(Boolean).join(' ');
}
function renderRoutine(){
 if(mode!=='routine')return;
 document.querySelectorAll('[data-slot]').forEach(button=>{
  const index=Number(button.dataset.slot);
  const t=byId(state.routine[index]);
  const card=button.closest('.slot-card');
  card.classList.toggle('is-active',index===activeSlot);
  button.replaceChildren();
  if(t)button.append(picture(t),node('span','word',t.label));
  else button.append(node('span','picture','➕'),node('span','word','Choose a picture'));
  button.setAttribute('aria-label',['Now','Then','After'][index]+': '+(t?t.label:'Choose picture'));
  card.querySelector('[data-clear-slot]').hidden=!t;
 });
 $('routineText').textContent=state.routine.map((id,i)=>['Now','Then','After'][i]+': '+(byId(id)?.label||'not chosen')).join('. ');
 $('choosingSlot').textContent=['Now','Then','After'][activeSlot];
}
function refresh(){
 renderGrid();if(mode==='talk')renderSentence();else renderRoutine();
 $('manageTiles').textContent=isManaging?'✓ Done editing':'✎ Edit tiles';
 $('manageTiles').classList.toggle('toggled',isManaging);
}
function openEditor(t){
 editingId=t?.id||null;
 const form=$('tileForm');form.reset();
 $('editHeading').textContent=t?'Edit picture / word':'Add picture / word';
 $('tileLabel').value=t?.label||'';
 $('tileEmoji').value=t?.emoji||'';
 $('tileCategory').value=t?.category||'Needs';
 $('removePhoto').checked=false;
 $('deleteTile').hidden=!t;
 $('photoNote').textContent=t?.image?'Current photo will be kept unless replaced or removed.':'Optional: choose a photo from this device.';
 const preview=$('editorPreview');preview.replaceChildren(picture(t||{emoji:'🖼️',image:''}),node('span','word',t?.label||'Your picture and word'));
 $('tileDialog').showModal();
 $('tileLabel').focus();
}
function imageData(file){
 if(!file)return Promise.resolve('');
 if(!file.type.startsWith('image/')||file.size>12*1024*1024) return Promise.reject(Error('Please choose an image under 12 MB.'));
 return new Promise((resolve,reject)=>{
  const src=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{
   try{
    const side=256;
    const canvas=document.createElement('canvas');canvas.width=side;canvas.height=side;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Unable to process this image.');
    ctx.fillStyle='#f6f8fc';ctx.fillRect(0,0,side,side);
    const scale=Math.max(side/img.width,side/img.height);
    const w=img.width*scale,h=img.height*scale;
    ctx.drawImage(img,(side-w)/2,(side-h)/2,w,h);
    const result=canvas.toDataURL('image/jpeg',.68);
    URL.revokeObjectURL(src);
    if(result.length>350000)throw Error('This processed photo is too large.');
    resolve(result);
   }catch(e){URL.revokeObjectURL(src);reject(e)}
  };
  img.onerror=()=>{URL.revokeObjectURL(src);reject(Error('The image could not be opened.'))};
  img.src=src;
 });
}
async function submitEditor(event){
 event.preventDefault();
 const name=$('tileLabel').value.trim();
 if(!name||name.length>70)return notify('Enter a word or phrase (up to 70 characters).');
 $('saveTile').disabled=true;
 try{
  const existing=editingId?byId(editingId):null;
  let image=existing?.image||'';
  if($('removePhoto').checked)image='';
  const file=$('tilePhoto').files?.[0];
  if(file)image=await imageData(file);
  const tile={id:existing?.id||uid(),label:name,emoji:$('tileEmoji').value.trim().slice(0,15)||'🖼️',category:$('tileCategory').value,image};
  const next=clone(state);
  if(existing){const idx=next.tiles.findIndex(t=>t.id===existing.id);if(idx<0)throw Error('That tile was not found.');next.tiles[idx]=tile}
  else{if(next.tiles.length>=160)throw Error('This board has reached the 160-tile limit.');next.tiles.push(tile)}
  if(save(next)){$('tileDialog').close();refresh();notify('Picture and word saved on this device.')}
 }catch(e){notify(e.message||'Unable to save this tile.')}
 finally{$('saveTile').disabled=false}
}
function removeTile(){
 if(!editingId)return;
 const t=byId(editingId);if(!t||!confirm('Delete "'+t.label+'" from both boards?'))return;
 const next=clone(state);
 next.tiles=next.tiles.filter(x=>x.id!==editingId);
 next.routine=next.routine.map(x=>x===editingId?null:x);
 if(save(next)){
  sentence=sentence.filter(x=>x!==editingId);
  $('tileDialog').close();refresh();notify('Tile deleted from this device.');
 }
}
function exportAll(){
 const payload={app:'conors-tisim-communication',version:1,exportedAt:new Date().toISOString(),data:state};
 const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='conors-tisim-communication-backup.json';
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 notify('Backup created. Keep this file private if it contains photographs.');
}
async function importAll(file){
 if(!file)return;
 try{
  if(file.size>12*1024*1024)throw Error('Backup file is too large.');
  const doc=JSON.parse(await file.text());
  if(doc.app!=='conors-tisim-communication')throw Error('This is not a Conor’s TiSiM Communication backup.');
  const next=validate(doc.data);
  if(!confirm('Replace the current picture library and Now / Then / After board? Export a backup first if you want to keep them.'))return;
  if(save(next)){sentence=[];activeSlot=0;isManaging=false;refresh();notify('Boards and pictures restored.')}
 }catch(e){notify(e.message||'Could not import this backup. Your current boards were not changed.')}
}
function init(){
 $('tileForm').addEventListener('submit',submitEditor);
 $('cancelEdit').addEventListener('click',()=>$('tileDialog').close());
 $('deleteTile').addEventListener('click',removeTile);
 $('addTile').addEventListener('click',()=>openEditor());
 $('manageTiles').addEventListener('click',()=>{isManaging=!isManaging;refresh()});
 $('searchTiles').addEventListener('input',renderGrid);
 $('filterCategory').addEventListener('change',renderGrid);
 $('exportAll').addEventListener('click',exportAll);
 $('importAll').addEventListener('click',()=>$('importFile').click());
 $('importFile').addEventListener('change',async e=>{await importAll(e.target.files?.[0]);e.target.value=''});
 if(mode==='talk'){
  $('speak').addEventListener('click',()=>readOut(sentence.map(id=>byId(id)?.label).filter(Boolean).join(' ')));
  $('clearMessage').addEventListener('click',()=>{sentence=[];renderSentence()});
  $('undoMessage').addEventListener('click',()=>{sentence.pop();renderSentence()});
 }else{
  document.querySelectorAll('[data-slot]').forEach(btn=>btn.addEventListener('click',()=>{
   activeSlot=Number(btn.dataset.slot);renderRoutine();$('searchTiles').focus();
  }));
  document.querySelectorAll('[data-clear-slot]').forEach(btn=>btn.addEventListener('click',()=>{
   const slot=Number(btn.dataset.clearSlot);const next=clone(state);next.routine[slot]=null;if(save(next))renderRoutine();
  }));
  $('readRoutine').addEventListener('click',()=>readOut(state.routine.map((id,i)=>['Now','Then','After'][i]+', '+(byId(id)?.label||'')).join('. ')));
  $('printRoutine').addEventListener('click',()=>window.print());
  $('clearRoutine').addEventListener('click',()=>{
   if(!confirm('Clear all three routine slots?'))return;
   const next=clone(state);next.routine=[null,null,null];if(save(next))renderRoutine();
  });
 }
 refresh();
}
init();
})();

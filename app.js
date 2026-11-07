// SUPER RECOVERY — local forensic agent interface.
// A user gesture is required once by browsers before audio may play.
(()=>{
 const intro=document.getElementById('intro'); if(!intro)return;
 const dog=document.getElementById('intro-dog');
 const status=document.getElementById('intro-status'), progress=document.getElementById('sniff-progress');
 const credentials=document.getElementById('credentials'), hint=document.getElementById('intro-hint');
 const credit='Developed by Software Developer and Cybersecurity Engineer - Tongai Godfrey Mapiye - Cyber Fortress Technologies, copyright 2026.';
 const barkSound=new Audio('https://upload.wikimedia.org/wikipedia/commons/4/4c/George_vuf_1996.ogg');
 barkSound.preload='auto';
 let audio;
 function noiseBurst(ctx,duration,gain,lowpass){const n=Math.floor(ctx.sampleRate*duration),buffer=ctx.createBuffer(1,n,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<n;i++){const t=i/n;data[i]=(Math.random()*2-1)*Math.pow(1-t,2.4)}const src=ctx.createBufferSource();src.buffer=buffer;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=lowpass;const g=ctx.createGain();g.gain.setValueAtTime(gain,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);src.connect(filter);filter.connect(g);g.connect(ctx.destination);src.start();src.stop(ctx.currentTime+duration)}
 function gunshot(){if(!audio)return;const t=audio.currentTime,osc=audio.createOscillator(),g=audio.createGain();osc.type='triangle';osc.frequency.setValueAtTime(115,t);osc.frequency.exponentialRampToValueAtTime(38,t+.13);g.gain.setValueAtTime(.32,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);osc.connect(g);g.connect(audio.destination);osc.start(t);osc.stop(t+.17);noiseBurst(audio,.12,.18,1800)}
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 async function run(){
  hint.textContent='The sniffer dog is searching for your lost data.';
  try{audio=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch(e){audio=null;hint.textContent='Audio is blocked by this browser; the visual sequence will continue.'}
  dog.classList.add('sniffing');status.textContent='SNIFFER DOG SEARCHING…';
  const begin=performance.now();while(performance.now()-begin<10000){progress.style.width=Math.min(100,(performance.now()-begin)/100)+'%';await wait(80)}
  progress.style.width='100%';dog.classList.remove('sniffing');status.textContent='TARGET DETECTED — ALERTING';
  for(let i=0;i<3;i++){dog.classList.add('barking');try{barkSound.currentTime=0;await barkSound.play();}catch(e){hint.textContent='The bark sound could not load; check your internet connection.'}await wait(380);dog.classList.remove('barking');await wait(320)}
  status.textContent='IDENTIFICATION';hint.textContent='';
  for(const word of credit.split(/\s+/)){const span=document.createElement('span');span.className='credential-word';span.textContent=word;credentials.appendChild(span);gunshot();await wait(165)}
  status.textContent='RECOVERY SYSTEM READY';await wait(900);intro.classList.add('dismissed');document.body.classList.add('app-ready');
  if(typeof refresh==='function')refresh();setTimeout(()=>intro.remove(),900);
 }
 // Start the intro automatically. Browsers may block sound until a user gesture;
 // the visual intro and application startup continue without requiring a sound button.
 window.addEventListener('load',()=>setTimeout(()=>run(),250),{once:true});
})();

const $=x=>document.getElementById(x);let disks=[],chosen=null,found=[],pollTimer=null;
const localAgent=['localhost','127.0.0.1','::1'].includes(location.hostname);
async function api(path,body){
 const response=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'}:{cache:'no-store'});
 const raw=await response.text();let data;try{data=JSON.parse(raw)}catch(e){throw new Error(response.status===404||raw.trim().startsWith('<')?'This page is hosted on GitHub Pages, not the Windows recovery agent. Start the local agent and open http://127.0.0.1:8765.':'The recovery agent returned an invalid response. Restart the local agent.')}
 if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);return data;
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showRemote(){ $('remote-warning').classList.remove('hidden');$('engine').textContent='OPEN LOCAL AGENT';$('connection').textContent='GitHub Pages · local agent not connected';$('drives').textContent='Physical storage detection is unavailable on this hosted page. Start the Windows agent.';$('parts').disabled=$('scan').disabled=true; }
$('open-local').onclick=()=>location.href='http://127.0.0.1:8765/';
async function refreshConsole(){
 if(!localAgent)return;
 try{const r=await api('/api/console');const entries=r.commands||[];$('command-log').textContent=entries.length?entries.map(x=>`[${x.time}] ${x.command}\n${x.returncode===null?'RUNNING':`Exit code: ${x.returncode}`}\n${x.output||''}`).join('\n\n'):'Waiting for a local scan command…';}
 catch(e){$('command-log').textContent='CMD log unavailable: '+e.message;}
}
async function refresh(){
 if(!localAgent){showRemote();return}
 try{
  const s=await api('/api/status');const payload=s.drives||{};disks=payload.drives||[];
  $('engine').textContent=s.ready?'READY':'TSK TOOLS MISSING';$('connection').textContent=s.ready?'LOCAL ENGINE ONLINE':'LOCAL AGENT ONLINE · INSTALL TSK TOOLS';
  $('drives').innerHTML=disks.length?disks.map(d=>`<div class="drive ${chosen===d.number?'selected':''}" data-n="${d.number}"><b>${esc(d.name||d.model||'Physical disk '+d.number)}</b><small>DISK ${d.number} · ${esc(d.bus)}</small><p>${esc(d.sizeHuman)} · ${esc(d.style)} · ${esc(d.health)}<br>${d.system||d.boot?'WINDOWS SYSTEM / BOOT DISK — ACKNOWLEDGEMENT REQUIRED':'Available for read-only analysis'}</p></div>`).join(''):'No physical disks detected. Connect a drive and refresh; run as Administrator.';
  const optical=payload.optical||[];$('optical').classList.toggle('hidden',!optical.length);$('optical').innerHTML=optical.length?'<b>Optical drives detected</b><br>'+optical.map(x=>`${esc(x.name)} · ${esc(x.drive||'No media letter')} · ${x.media==='True'?'Media loaded':'No media loaded'} (optical recovery is not yet supported by this TSK workflow)`).join('<br>'):'';
  document.querySelectorAll('.drive').forEach(e=>e.onclick=()=>select(+e.dataset.n));
  if(!s.ready){$('progress').classList.remove('hidden');$('progress').textContent='Required Sleuth Kit commands missing: '+Object.keys(s.tools||{}).filter(k=>!s.tools[k]).join(', ')+'. Install The Sleuth Kit and add its bin folder to Windows PATH.'}
 }catch(e){$('engine').textContent='OFFLINE';$('connection').textContent='LOCAL AGENT ERROR';$('drives').textContent=e.message;$('remote-warning').classList.remove('hidden');$('remote-warning').querySelector('p').textContent=e.message+' Start Start-Super-Recovery-as-Admin.bat and use http://127.0.0.1:8765.'}
}
function select(n){chosen=n;const d=disks.find(x=>x.number===n);if(!d)return;const protectedDisk=d.system||d.boot;$('scan').disabled=$('parts').disabled=protectedDisk&&!$('allow-system').checked;document.querySelectorAll('.drive').forEach(e=>e.classList.toggle('selected',+e.dataset.n===n));$('progress').classList.remove('hidden');$('progress').textContent='AutoSearch: reading partition map…';if(!protectedDisk||$('allow-system').checked)autoSearchDevice();else $('progress').textContent='Windows system disk selected. Tick the read-only acknowledgement to proceed.'}
$('allow-system').onchange=()=>{if(chosen!==null){const d=disks.find(x=>x.number===chosen);if(d){$('scan').disabled=$('parts').disabled=(d.system||d.boot)&&!$('allow-system').checked;if($('allow-system').checked)autoSearchDevice()}}};
async function waitScan(){for(let i=0;i<1800;i++){await new Promise(r=>setTimeout(r,1000));const s=await api('/api/scan-status');$('progress').textContent=s.message||s.status;if(s.status==='complete')return s;if(s.status==='error')throw new Error(s.message); }throw new Error('Scan timed out.');}
async function autoSearchDevice(){
 const mode=$('scan-mode')?.value||'quick';
 if(mode==='raw'){await runPhotoRecRaw();return}
 try{
  found=[];render();$('progress').classList.remove('hidden');$('progress').textContent='AutoSearch: detecting partitions…';
  await api('/api/scan',{disk:chosen,listPartitions:true,allowSystem:$('allow-system').checked});const partResult=await waitScan();const partitions=partResult.partitions||[];parts(partitions);
  const targets=partitions.length?partitions:[{start:0,description:'Whole disk'}];let all=[];
  for(let i=0;i<targets.length;i++){$('progress').textContent=`AutoSearch: scanning ${i+1} of ${targets.length} partition(s)…`;await api('/api/scan',{disk:chosen,offset:targets[i].start,allowSystem:$('allow-system').checked});const result=await waitScan();all=all.concat((result.items||[]).map(item=>({...item,offset:targets[i].start})));}
  found=all;render();$('progress').textContent=`Quick scan complete: ${found.length} deleted file-system entries found across ${targets.length} partition(s).`;
  if(mode==='deep'){
   $('progress').textContent+=' Starting PhotoRec raw recovery…';
   await runPhotoRecRaw(true);
  }
 }catch(e){$('progress').textContent='SCAN ERROR: '+e.message}
}

async function runPhotoRecRaw(fromDeep=false){
 const destination=$('destination').value.trim();
 if(!destination){
  $('recovery-status').classList.remove('hidden');
  $('recovery-status').textContent='Choose a recovery destination on a different physical drive before starting Raw Recovery.';
  $('destination').focus();return;
 }
 if(chosen===null)return;
 const device=disks.find(x=>x.number===chosen);
 if(!device)return;
 if((device.system||device.boot)&&!$('allow-system').checked){
  $('recovery-status').classList.remove('hidden');
  $('recovery-status').textContent='System/boot disk requires the read-only acknowledgement.';
  return;
 }
 const label=fromDeep?'Deep Scan will now run PhotoRec raw recovery.':'Raw Recovery will scan the selected physical disk for known file signatures.';
 if(!confirm(`${label}\n\nRecovered files will be written to:\n${destination}\n\nThis can take hours. Do not save anything to the source disk. Continue?`))return;
 $('recovery-status').classList.remove('hidden');$('recovery-status').textContent='Starting PhotoRec…';
 try{
  await api('/api/raw-recover',{disk:chosen,destination,allowSystem:$('allow-system').checked});
  for(let i=0;i<43200;i++){
   await new Promise(r=>setTimeout(r,2000));
   const state=await api('/api/scan-status');
   $('recovery-status').textContent=state.message||state.status;
   if(state.logTail?.length)$('recovery-status').textContent+='\\n\\n'+state.logTail.slice(-12).join('\\n');
   if(state.status==='complete'){
    $('recovery-status').textContent+='\\n\\nOutput folders:\\n'+(state.recoveredFolders||[]).join('\\n');
    return;
   }
   if(state.status==='error')throw new Error(state.message||'PhotoRec failed');
  }
  throw new Error('PhotoRec is still running; check the local agent status and destination folders.');
 }catch(e){$('recovery-status').textContent='RAW RECOVERY ERROR: '+e.message}
}

$('testdisk-analyze').onclick=async()=>{
 if(chosen===null)return alert('Select a physical disk first.');
 const device=disks.find(x=>x.number===chosen);
 if((device?.system||device?.boot)&&!$('allow-system').checked)return alert('Acknowledge read-only system-disk scanning first.');
 if(!confirm('Run TestDisk partition analysis on the selected disk? This starts a read-only search; it will not write partition changes.'))return;
 $('recovery-status').classList.remove('hidden');$('recovery-status').textContent='Starting TestDisk…';
 try{
  await api('/api/testdisk-analyze',{disk:chosen,allowSystem:$('allow-system').checked});
  for(let i=0;i<7200;i++){
   await new Promise(r=>setTimeout(r,2000));
   const state=await api('/api/scan-status');
   $('recovery-status').textContent=state.message||state.status;
   if(state.logTail?.length)$('recovery-status').textContent+='\\n\\n'+state.logTail.slice(-12).join('\\n');
   if(state.status==='complete')return;
   if(state.status==='error')throw new Error(state.message);
  }
  throw new Error('TestDisk analysis is still running; check the local agent.');
 }catch(e){$('recovery-status').textContent='TESTDISK ERROR: '+e.message}
};
$('refresh').onclick=refresh;$('parts').onclick=()=>autoSearchDevice();$('scan').onclick=()=>autoSearchDevice();
function parts(a){$('partitions').classList.remove('hidden');$('partitions').innerHTML=a.length?a.map(p=>`<div><span>${esc(p.description)} · sector ${p.start}</span><small>Included in automatic scan</small></div>`).join(''):'<div>No partition table entries returned. Whole-device scan attempted.</div>'}
function render(){const q=$('filter').value.toLowerCase(),a=found.filter(x=>x.name.toLowerCase().includes(q));$('count').textContent=found.length;$('rows').innerHTML=a.length?a.map(x=>`<tr><td>${esc(x.name)}<small>${esc(x.raw)}</small></td><td>${esc(x.type)}</td><td>${esc(x.inode)}</td><td><input type="checkbox" class="pick" data-inode="${esc(x.inode)}"></td></tr>`).join(''):'<tr><td colspan="4">No deleted entries found in the selected partitions.</td></tr>';document.querySelectorAll('.pick').forEach(x=>x.onchange=update);updateRecoveryButtons()}
function update(){const n=document.querySelectorAll('.pick:checked').length;$('selected').textContent=n+' selected';updateRecoveryButtons()}
$('filter').oninput=render;$('recover').onclick=async()=>{const dest=$('destination').value.trim(),items=[...document.querySelectorAll('.pick:checked')].map(c=>found.find(x=>x.inode===c.dataset.inode));if(!dest)return alert('Enter an existing folder on a separate healthy drive.');if(!confirm(`Recover ${items.length} item(s) to ${dest}?`))return;for(const x of items){try{const z=await api('/api/recover',{disk:chosen,offset:x.offset??(+$('offset').value||0),inode:x.inode,name:x.name,destination:dest});alert('Saved: '+z.saved)}catch(e){alert('Could not recover '+x.name+': '+e.message)}}};
refresh();refreshConsole();if(localAgent){pollTimer=setInterval(()=>{refresh();refreshConsole()},5000);setInterval(refreshConsole,1500)}else showRemote();


// One-click batch recovery: choose a destination once, then attempt every found candidate.
$('choose-destination').onclick=async()=>{
 try{
  const r=await api('/api/choose-destination',{});
  if(r.cancelled)return;
  $('destination').value=r.destination||'';
  updateRecoveryButtons();
 }catch(e){$('recovery-status').classList.remove('hidden');$('recovery-status').textContent='Folder selection failed: '+e.message}
};
$('destination').addEventListener('input',updateRecoveryButtons);
function updateRecoveryButtons(){
 const hasFolder=!!$('destination').value.trim(),hasFound=found.length>0;
 $('recover-all').disabled=!(hasFolder&&hasFound&&chosen!==null);
 $('recover').disabled=!(hasFolder&&document.querySelectorAll('.pick:checked').length>0&&chosen!==null);
}
async function waitRecovery(){
 for(let i=0;i<3600;i++){
  await new Promise(r=>setTimeout(r,1000));
  const state=await api('/api/scan-status');
  $('recovery-status').classList.remove('hidden');
  $('recovery-status').textContent=state.message||state.status;
  if(state.status==='complete'||state.status==='error')return state;
 }
 throw new Error('Recovery task timed out.');
}
$('recover-all').onclick=async()=>{
 const recoverable=found.filter(x=>String(x.type||'').startsWith('r/'));
 if(!recoverable.length){$('recovery-status').classList.remove('hidden');$('recovery-status').textContent='No regular deleted files were identified. Directory entries and unsupported file types are not batch-recovered.';return;}
 const destination=$('destination').value.trim();
 if(!destination)return alert('Choose where recovered files should be saved.');
 if(!confirm(`Attempt recovery of all ${recoverable.length} discovered files to:\\n${destination}\\n\\nThe source disk will not be used as the destination. Continue?`))return;
 $('recover-all').disabled=true;$('recover').disabled=true;
 $('recovery-status').classList.remove('hidden');
 try{
  await api('/api/recover-batch',{disk:chosen,destination,items:recoverable.map(x=>({inode:x.inode,name:x.name,offset:x.offset??(+$('offset').value||0)}))});
  const result=await waitRecovery();
  const ok=result.recovered||[],bad=result.failures||[];
  $('recovery-status').textContent=`${result.message}\\nSaved ${ok.length} file(s) to ${result.destination||destination}. ${bad.length} item(s) could not be recovered.`;
  if(ok.length)$('recovery-status').textContent+=`\\n\\nRecovered files:\\n`+ok.slice(0,12).map(x=>x.saved).join('\\n')+(ok.length>12?`\\n…and ${ok.length-12} more`:'');
  if(bad.length)$('recovery-status').textContent+=`\\n\\nFailed examples:\\n`+bad.slice(0,8).map(x=>`${x.name}: ${x.error}`).join('\\n');
 }catch(e){$('recovery-status').textContent='RECOVERY ERROR: '+e.message}
 finally{updateRecoveryButtons()}
};


// Replace the desktop mouse pointer with an animated sniffer dog.
(()=>{
 const cursor=document.getElementById('sniffer-cursor');
 if(!cursor || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
 let raf=0, x=-100, y=-100;
 document.addEventListener('pointermove', event=>{
   x=event.clientX-18;
   y=event.clientY-22;
   if(!cursor.classList.contains('visible')) cursor.classList.add('visible');
   if(!raf) raf=requestAnimationFrame(()=>{
     cursor.style.transform=`translate3d(${x}px,${y}px,0)`;
     raf=0;
   });
 }, {passive:true});
 document.addEventListener('pointerleave', ()=>cursor.classList.remove('visible'));
 document.addEventListener('pointerenter', ()=>cursor.classList.add('visible'));
})();

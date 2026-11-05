
// Startup: 10 seconds of sniffing, three barks, then credentials appear word-by-word.
(()=>{
 const intro=document.getElementById('intro'); if(!intro)return;
 const start=document.getElementById('enter-app'), dog=document.getElementById('intro-dog');
 const status=document.getElementById('intro-status'), progress=document.getElementById('sniff-progress');
 const credentials=document.getElementById('credentials'), hint=document.getElementById('intro-hint');
 const credit='Developed by Software Developer and Cybersecurity Engineer - Tongai Godfrey Mapiye - Cyber Fortress Technologies, copyright 2026.';
 let audio;
 function noiseBurst(ctx, duration, gain, lowpass){
   const n=Math.floor(ctx.sampleRate*duration), buffer=ctx.createBuffer(1,n,ctx.sampleRate), data=buffer.getChannelData(0);
   for(let i=0;i<n;i++){const t=i/n;data[i]=(Math.random()*2-1)*Math.pow(1-t,2.4)}
   const src=ctx.createBufferSource();src.buffer=buffer;
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=lowpass;
   const g=ctx.createGain();g.gain.setValueAtTime(gain,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
   src.connect(filter);filter.connect(g);g.connect(ctx.destination);src.start();src.stop(ctx.currentTime+duration);
 }
 function gunshot(){
   if(!audio)return;const t=audio.currentTime;
   const osc=audio.createOscillator(),g=audio.createGain();osc.type='triangle';osc.frequency.setValueAtTime(115,t);osc.frequency.exponentialRampToValueAtTime(38,t+.13);
   g.gain.setValueAtTime(.42,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);osc.connect(g);g.connect(audio.destination);osc.start(t);osc.stop(t+.17);
   noiseBurst(audio,.12,.22,1800);
 }
 function bark(){
   if(!audio)return;const t=audio.currentTime;
   const osc=audio.createOscillator(),g=audio.createGain(),filter=audio.createBiquadFilter();
   osc.type='sawtooth';osc.frequency.setValueAtTime(155,t);osc.frequency.exponentialRampToValueAtTime(78,t+.22);
   filter.type='lowpass';filter.frequency.value=850;g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.32,t+.035);g.gain.exponentialRampToValueAtTime(.001,t+.27);
   osc.connect(filter);filter.connect(g);g.connect(audio.destination);osc.start(t);osc.stop(t+.28);noiseBurst(audio,.19,.15,1100);
 }
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 async function run(){
   start.disabled=true;start.textContent='SNIFFING…';hint.textContent='The sniffer dog is searching for your lost data.';
   try{audio=new (window.AudioContext||window.webkitAudioContext)();await audio.resume()}catch(e){audio=null;hint.textContent='Sound is unavailable in this browser; the visual sequence will continue.'}
   dog.classList.add('sniffing');status.textContent='SNIFFER DOG SEARCHING…';
   const begin=performance.now();while(performance.now()-begin<10000){progress.style.width=Math.min(100,(performance.now()-begin)/100)+'%';await wait(80)}
   progress.style.width='100%';dog.classList.remove('sniffing');status.textContent='TARGET DETECTED — ALERTING';
   for(let i=0;i<3;i++){dog.classList.add('barking');bark();await wait(350);dog.classList.remove('barking');await wait(350)}
   status.textContent='IDENTIFICATION';hint.textContent='';
   const words=credit.split(/\s+/);
   for(const word of words){const span=document.createElement('span');span.className='credential-word';span.textContent=word;credentials.appendChild(span);gunshot();await wait(165)}
   status.textContent='RECOVERY SYSTEM READY';await wait(1250);
   intro.classList.add('dismissed');document.body.classList.add('app-ready');
   if(typeof refresh==='function')refresh();
   setTimeout(()=>intro.remove(),900);
 }
 start.addEventListener('click',run,{once:true});
})();

const $=x=>document.getElementById(x);let disks=[],chosen=null,found=[];
async function api(p,b){let r=await fetch(p,b?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}:{}),d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function refresh(){try{let s=await api('/api/status');disks=s.drives.drives||[];$('engine').textContent=s.ready?'READY':'INSTALL TSK TOOLS';$('connection').textContent=s.ready?'LOCAL ENGINE ONLINE':'Agent online · TSK tools missing';$('drives').innerHTML=disks.length?disks.map(d=>`<div class="drive ${chosen===d.number?'selected':''}" data-n="${d.number}"><b>${esc(d.name||d.model||'Physical disk '+d.number)}</b><small>DISK ${d.number} · ${esc(d.bus)}</small><p>${esc(d.sizeHuman)} · ${esc(d.style)} · ${esc(d.health)}<br>${d.system||d.boot?'SYSTEM / BOOT — PROTECTED':'Available'}</p></div>`).join(''):'No physical drives found. Run as Administrator.';document.querySelectorAll('.drive').forEach(e=>e.onclick=()=>select(+e.dataset.n))}catch(e){$('engine').textContent='OFFLINE';$('drives').textContent=e.message}}
function select(n){chosen=n;let d=disks.find(x=>x.number===n);$('scan').disabled=$('parts').disabled=!!(d.system||d.boot);document.querySelectorAll('.drive').forEach(e=>e.classList.toggle('selected',+e.dataset.n===n));if(!d.system&&!d.boot)autoPartitions()}
async function autoPartitions(){try{$('progress').classList.remove('hidden');$('progress').textContent='AutoSearch: detecting partitions…';await api('/api/scan',{disk:chosen,listPartitions:true});await poll()}catch(e){$('progress').textContent='AutoSearch could not start: '+e.message}}
async function startAutoScan(){try{found=[];render();$('progress').classList.remove('hidden');$('progress').textContent='AutoSearch: scanning deleted file entries…';await api('/api/scan',{disk:chosen,offset:+$('offset').value||0});await poll()}catch(e){$('progress').textContent='Scan could not start: '+e.message}}
async function poll(){for(let i=0;i<1200;i++){await new Promise(r=>setTimeout(r,1000));let s=await api('/api/scan-status');$('progress').textContent=s.message;if(s.status==='complete'){parts(s.partitions||[]);found=s.items||[];render();return}if(s.status==='error'){$('progress').textContent='ERROR: '+s.message;return}}}
$('refresh').onclick=refresh;$('parts').onclick=async()=>{try{$('progress').classList.remove('hidden');await api('/api/scan',{disk:chosen,listPartitions:true});await poll()}catch(e){$('progress').textContent=e.message}};
$('scan').onclick=async()=>{try{found=[];render();$('progress').classList.remove('hidden');$('progress').textContent='Starting deleted-file scan…';await api('/api/scan',{disk:chosen,offset:+$('offset').value||0});await poll()}catch(e){$('progress').textContent=e.message}};
function parts(a){$('partitions').classList.remove('hidden');$('partitions').innerHTML=a.length?a.map(p=>`<div><span>${esc(p.description)} · sector ${p.start}</span><button data-off="${p.start}">Scan this partition</button></div>`).join(''):'<div>No partition table entries returned. <button id="scan-whole">Scan whole device</button></div>';document.querySelectorAll('[data-off]').forEach(b=>b.onclick=()=>{$('offset').value=b.dataset.off;startAutoScan()});let w=$('scan-whole');if(w)w.onclick=startAutoScan}
function render(){let q=$('filter').value.toLowerCase(),a=found.filter(x=>x.name.toLowerCase().includes(q));$('count').textContent=found.length;$('rows').innerHTML=a.length?a.map(x=>`<tr><td>${esc(x.name)}<small>${esc(x.raw)}</small></td><td>${esc(x.type)}</td><td>${esc(x.inode)}</td><td><input type="checkbox" class="pick" data-inode="${esc(x.inode)}"></td></tr>`).join(''):'<tr><td colspan="4">No deleted entries found.</td></tr>';document.querySelectorAll('.pick').forEach(x=>x.onchange=update)}
function update(){let n=document.querySelectorAll('.pick:checked').length;$('selected').textContent=n+' selected';$('recover').disabled=!n}
$('filter').oninput=render;$('recover').onclick=async()=>{let dest=$('destination').value.trim(),items=[...document.querySelectorAll('.pick:checked')].map(c=>found.find(x=>x.inode===c.dataset.inode));if(!dest)return alert('Enter an existing folder on another drive.');if(!confirm(`Recover ${items.length} item(s) to ${dest}?`))return;for(let x of items){try{let z=await api('/api/recover',{disk:chosen,offset:+$('offset').value||0,inode:x.inode,name:x.name,destination:dest});alert('Saved: '+z.saved)}catch(e){alert('Could not recover '+x.name+': '+e.message)}}};// Start the local recovery engine only after the branded intro finishes.

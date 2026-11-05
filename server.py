import json, os, re, shutil, subprocess, threading, time
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlparse
BASE=Path(__file__).resolve().parent
LOCK=threading.Lock()
STATE={"status":"idle","items":[],"message":"Select a drive."}
COMMAND_LOG=[]
LOG_LOCK=threading.Lock()
TOOLS=("mmls","fls","icat","fsstat")
OPTIONAL_TOOLS=("tsk_recover","photorec","testdisk")
def toolmap(): return {x:shutil.which(x) for x in TOOLS}
def optional_toolmap(): return {x:shutil.which(x) for x in OPTIONAL_TOOLS}
def command_text(args):
 return subprocess.list2cmdline([str(x) for x in args])
def record_command(args, returncode=None, output="", error=""):
 entry={"time":time.strftime("%H:%M:%S"),"command":command_text(args),"returncode":returncode,
        "output":(output or error or "").strip()[-3500:]}
 with LOG_LOCK:
  COMMAND_LOG.append(entry)
  del COMMAND_LOG[:-100]
def cmd(a,timeout=900):
 # Run only application-generated, allow-listed Sleuth Kit commands through Windows CMD.
 # No command text is accepted from the browser; arguments are built from validated fields.
 args=[str(x) for x in a]
 if os.name=="nt":
  invocation=["cmd.exe","/d","/c",command_text(args)]
 else:
  invocation=args
 p=subprocess.run(invocation,capture_output=True,text=True,errors="replace",timeout=timeout,
                  creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
 record_command(args,p.returncode,p.stdout,p.stderr)
 if p.returncode not in (0,1): raise RuntimeError((p.stderr or p.stdout)[-2000:] or f"Command exited with code {p.returncode}")
 return p.stdout

def destination_is_separate(dest, disk_number):
 if os.name != "nt": return False, "Recovery destination validation requires Windows."
 drive = dest.drive.rstrip(":\\/")
 if not re.fullmatch(r"[A-Za-z]", drive):
  return False, "Choose a local drive-letter destination (for example E:\\Recovered)."
 script = f"$p=Get-Partition -DriveLetter '{drive}' -ErrorAction Stop | Select-Object -First 1 -ExpandProperty DiskNumber; Write-Output $p"
 try:
  result = subprocess.check_output(["powershell","-NoProfile","-Command",script],text=True,timeout=20).strip()
  if not result: return False, "Could not identify the physical disk containing the destination."
  if int(result) == int(disk_number):
   return False, "Forensic safety: save recovered files to a different physical disk from the source."
  return True, ""
 except Exception as e:
  return False, f"Could not validate destination disk: {e}"

def recover_one(disk, offset, inode, name, destination):
 if not re.fullmatch(r"\d+(?:-\d+)*", str(inode)): raise ValueError("Invalid inode")
 dest=Path(destination).expanduser().resolve()
 if not dest.is_dir(): raise ValueError("Choose an existing destination folder.")
 safe,reason=destination_is_separate(dest,disk)
 if not safe: raise ValueError(reason)
 src=rf"\\.\PhysicalDrive{disk}"
 if not shutil.which("icat"): raise RuntimeError("TSK icat not installed")
 filename=re.sub(r'[<>:"/\\|?*\x00-\x1f]',"_",Path(str(name or "recovered-file")).name).strip(" .") or "recovered-file"
 out=dest/filename;stem,suf=out.stem,out.suffix;i=1
 while out.exists(): out=dest/f"{stem}_{i}{suf}";i+=1
 args=["icat","-o",str(int(offset)),src,str(inode)]
 with out.open("wb") as f:
  if os.name=="nt":
   q=subprocess.run(["cmd.exe","/d","/c",command_text(args)],stdout=f,stderr=subprocess.PIPE,timeout=300,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
  else:
   q=subprocess.run(args,stdout=f,stderr=subprocess.PIPE,timeout=300)
 record_command(args,q.returncode,"icat output redirected to recovery file",q.stderr.decode(errors="replace"))
 if q.returncode:
  out.unlink(missing_ok=True)
  raise RuntimeError(q.stderr.decode(errors="replace")[-1500:] or f"icat exited with code {q.returncode}")
 return {"name":filename,"saved":str(out),"bytes":out.stat().st_size}

def disks():
 if os.name!="nt": return {"drives":[],"optical":[],"message":"Physical drive access is Windows-only. Start this agent on Windows."}
 ps=r"""
 Get-Disk | ForEach-Object {
 [pscustomobject]@{number=[int]$_.Number;name=[string]$_.FriendlyName;model=[string]$_.Model;bus=[string]$_.BusType;size=[int64]$_.Size;health=[string]$_.HealthStatus;system=[bool]$_.IsSystem;boot=[bool]$_.IsBoot;style=[string]$_.PartitionStyle;operational=[string]($_.OperationalStatus -join ', ')}
 } | ConvertTo-Json -Compress
 """
 cd=r"""
 Get-CimInstance Win32_CDROMDrive | ForEach-Object {
 [pscustomobject]@{name=[string]$_.Name;drive=[string]$_.Drive;caption=[string]$_.Caption;media=[string]$_.MediaLoaded}
 } | ConvertTo-Json -Compress
 """
 try:
  x=subprocess.check_output(["powershell","-NoProfile","-Command",ps],text=True,timeout=30).strip()
  a=json.loads(x) if x else []
  if isinstance(a,dict): a=[a]
  for d in a:
   d["device"]=rf"\\.\PhysicalDrive{d['number']}"
   n=float(d["size"])
   for u in ("B","KB","MB","GB","TB"):
    if n<1024 or u=="TB": d["sizeHuman"]=f"{n:.1f} {u}";break
    n/=1024
  y=subprocess.check_output(["powershell","-NoProfile","-Command",cd],text=True,timeout=30).strip()
  optical=json.loads(y) if y else []
  if isinstance(optical,dict): optical=[optical]
  return {"drives":a,"optical":optical}
 except Exception as e:return {"drives":[],"optical":[],"message":str(e)}
def parse_parts(s):
 out=[]
 for l in s.splitlines():
  m=re.match(r"^\s*(\d+):\s+(?:Meta\s+|\d+:\d+\s+)?(\d+)\s+(\d+)\s+(\d+)\s+(.+?)\s*$",l)
  if m:
   slot,start,end,length,desc=m.groups()
   if int(length)>0 and "Unallocated" not in desc and "Primary Table" not in desc and "Meta" not in desc:out.append({"slot":slot,"start":int(start),"length":int(length),"description":desc.strip()})
 return out
def parse_deleted(s):
 out=[]
 for l in s.splitlines():
  m=re.match(r"^\s*([a-zA-Z]/[a-zA-Z])\s+\*\s*([0-9]+(?:-[0-9]+)*)\s*:\s*(.*?)\s*$",l)
  if m:
   typ,inode,name=m.groups()
   if name.strip() not in ("",".",".."):out.append({"type":typ,"inode":inode,"name":name.strip(),"raw":l.strip()})
 return out
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(BASE),**k)
 def log_message(self,*a):pass
 def reply(self,x,c=200):
  b=json.dumps(x).encode();self.send_response(c);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(b)));self.send_header("Cache-Control","no-store");self.end_headers();self.wfile.write(b)
 def body(self):
  n=int(self.headers.get("Content-Length","0"))
  if n>1000000:raise ValueError("Request too large")
  return json.loads(self.rfile.read(n) or b"{}")
 def do_GET(self):
  p=urlparse(self.path).path
  if p=="/api/status":
   t=toolmap();self.reply({"tools":t,"optionalTools":optional_toolmap(),"ready":all(t.values()),"platform":os.name,"drives":disks()})
  elif p=="/api/drives":self.reply(disks())
  elif p=="/api/scan-status":self.reply(STATE)
  elif p=="/api/console":
   with LOG_LOCK: self.reply({"commands":list(COMMAND_LOG)})
  elif p.startswith("/api/"):self.reply({"error":"Unknown API endpoint"},404)
  else:super().do_GET()
 def do_POST(self):
  global STATE
  try:d=self.body()
  except Exception as e:return self.reply({"error":str(e)},400)
  p=urlparse(self.path).path
  if p=="/api/scan":
   if not LOCK.acquire(False):return self.reply({"error":"Scan already running"},409)
   STATE={"status":"queued","items":[],"message":"Scan queued…"};threading.Thread(target=self.scan,args=(d,),daemon=True).start();return self.reply({"ok":True},202)
  if p=="/api/choose-destination":
   try:
    if os.name!="nt": raise RuntimeError("Folder picker is available in the Windows local agent.")
    import tkinter as tk
    from tkinter import filedialog
    root=tk.Tk();root.withdraw();root.attributes("-topmost",True)
    folder=filedialog.askdirectory(title="Choose a recovery destination on a different physical drive")
    root.destroy()
    if not folder:return self.reply({"cancelled":True})
    return self.reply({"destination":folder})
   except Exception as e:return self.reply({"error":str(e)},400)
  if p=="/api/recover":
   try:
    result=recover_one(int(d["disk"]),int(d.get("offset",0)),str(d["inode"]),d.get("name","recovered-file"),d["destination"])
    return self.reply({"ok":True,**result})
   except Exception as e:return self.reply({"error":str(e)},400)
  if p=="/api/recover-batch":
   if not LOCK.acquire(False):return self.reply({"error":"Another scan or recovery task is running"},409)
   items=d.get("items",[])
   if not isinstance(items,list) or not items or len(items)>10000:
    LOCK.release();return self.reply({"error":"No recovery candidates supplied, or too many candidates."},400)
   STATE={"status":"recovering","message":"Starting automatic recovery…","recovered":[],"failures":[],"total":len(items),"done":0}
   threading.Thread(target=self.recover_batch,args=(d,),daemon=True).start()
   return self.reply({"ok":True,"total":len(items)},202)
  self.reply({"error":"Unknown endpoint"},404)
 def recover_batch(self,d):
  global STATE
  try:
   disk=int(d["disk"]);dest=str(d["destination"]);items=d.get("items",[])
   # Validate target disk before processing any candidate.
   folder=Path(dest).expanduser().resolve()
   if not folder.is_dir():raise ValueError("Choose an existing destination folder.")
   safe,reason=destination_is_separate(folder,disk)
   if not safe:raise ValueError(reason)
   recovered=[];failures=[]
   for index,item in enumerate(items,1):
    try:
     result=recover_one(disk,int(item.get("offset",0)),str(item["inode"]),item.get("name","recovered-file"),dest)
     recovered.append(result)
    except Exception as e:
     failures.append({"name":str(item.get("name","unknown")),"error":str(e)})
    STATE={"status":"recovering","message":f"Recovering files: {index} of {len(items)} processed…","recovered":recovered,"failures":failures,"total":len(items),"done":index,"destination":str(folder)}
   STATE={"status":"complete","message":f"Automatic recovery finished: {len(recovered)} recovered, {len(failures)} failed.","recovered":recovered,"failures":failures,"total":len(items),"done":len(items),"destination":str(folder)}
  except Exception as e:
   STATE={"status":"error","message":str(e),"items":[],"recovered":[],"failures":[]}
  finally:LOCK.release()
 def scan(self,d):
  global STATE
  try:
   if os.name!="nt":raise RuntimeError("Physical disk scanning requires Windows")
   miss=[x for x,v in toolmap().items() if not v]
   if miss:raise RuntimeError("Install The Sleuth Kit and add its bin folder to PATH. Missing: "+", ".join(miss))
   disk=int(d["disk"]);off=int(d.get("offset",0));a=disks()["drives"]
   dev=next((x for x in a if x["number"]==disk),None)
   if not dev:raise RuntimeError("Drive unavailable")
   if (dev["system"] or dev["boot"]) and not d.get("allowSystem"):
    raise RuntimeError("This is the Windows system/boot disk. Tick the read-only system-disk acknowledgement before scanning it. Close active applications first; a forensic image is safer.")
   src=rf"\\.\PhysicalDrive{disk}"
   if d.get("listPartitions"):
    STATE={"status":"running","message":"Reading partition table…","items":[]}
    ps=parse_parts(cmd(["mmls",src],120))
    STATE={"status":"complete","message":"Select a partition start sector.","partitions":ps,"items":[]}
   else:
    STATE={"status":"running","message":"Searching deleted directory entries…","items":[]}
    x=parse_deleted(cmd(["fls","-r","-d","-p","-o",str(off),src]))
    STATE={"status":"complete","message":f"Found {len(x)} deleted entries. Recovery is not guaranteed.","items":x,"count":len(x)}
  except Exception as e:STATE={"status":"error","message":str(e),"items":[]}
  finally:LOCK.release()
if __name__=="__main__":
 print("SUPER RECOVERY local agent: http://127.0.0.1:8765")
 ThreadingHTTPServer(("127.0.0.1",8765),H).serve_forever()

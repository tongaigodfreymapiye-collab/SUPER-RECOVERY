import json, os, re, shutil, subprocess, threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlparse
BASE=Path(__file__).resolve().parent
LOCK=threading.Lock()
STATE={"status":"idle","items":[],"message":"Select a drive."}
TOOLS=("mmls","fls","icat","fsstat")
def toolmap(): return {x:shutil.which(x) for x in TOOLS}
def cmd(a,timeout=900):
 p=subprocess.run(a,capture_output=True,text=True,errors="replace",timeout=timeout,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
 if p.returncode not in (0,1): raise RuntimeError((p.stderr or p.stdout)[-2000:])
 return p.stdout
def disks():
 if os.name!="nt": return {"drives":[],"message":"Physical drive access is Windows-only."}
 ps=r"""
 Get-Disk | ForEach-Object {
 [pscustomobject]@{number=[int]$_.Number;name=[string]$_.FriendlyName;model=[string]$_.Model;bus=[string]$_.BusType;size=[int64]$_.Size;health=[string]$_.HealthStatus;system=[bool]$_.IsSystem;boot=[bool]$_.IsBoot;style=[string]$_.PartitionStyle}
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
  return {"drives":a}
 except Exception as e:return {"drives":[],"message":str(e)}
def parse_parts(s):
 out=[]
 for l in s.splitlines():
  m=re.match(r"^\s*(\d+):\s+(\d+)\s+(\d+)\s+(\d+)\s+(.+?)\s*$",l)
  if m:
   slot,start,end,length,desc=m.groups()
   if int(length)>0 and "Unallocated" not in desc:out.append({"slot":slot,"start":int(start),"length":int(length),"description":desc.strip()})
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
   t=toolmap();self.reply({"tools":t,"ready":all(t.values()),"drives":disks()})
  elif p=="/api/drives":self.reply(disks())
  elif p=="/api/scan-status":self.reply(STATE)
  else:super().do_GET()
 def do_POST(self):
  global STATE
  try:d=self.body()
  except Exception as e:return self.reply({"error":str(e)},400)
  p=urlparse(self.path).path
  if p=="/api/scan":
   if not LOCK.acquire(False):return self.reply({"error":"Scan already running"},409)
   threading.Thread(target=self.scan,args=(d,),daemon=True).start();return self.reply({"ok":True},202)
  if p=="/api/recover":
   try:
    disk=int(d["disk"]);off=int(d.get("offset",0));inode=str(d["inode"])
    if not re.fullmatch(r"\d+(?:-\d+)*",inode):raise ValueError("Invalid inode")
    dest=Path(d["destination"]).expanduser()
    if not dest.is_dir():raise ValueError("Choose an existing folder on a separate healthy drive")
    src=rf"\\.\PhysicalDrive{disk}"
    if not shutil.which("icat"):raise RuntimeError("TSK icat not installed")
    name=re.sub(r'[<>:"/\\|?*\x00-\x1f]',"_",Path(str(d.get("name","recovered-file"))).name).strip(" .") or "recovered-file"
    out=dest/name;stem,suf=out.stem,out.suffix;i=1
    while out.exists():out=dest/f"{stem}_{i}{suf}";i+=1
    with out.open("wb") as f:
     q=subprocess.run(["icat","-o",str(off),src,inode],stdout=f,stderr=subprocess.PIPE,timeout=300,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
    if q.returncode:out.unlink(missing_ok=True);raise RuntimeError(q.stderr.decode(errors="replace")[-1500:])
    return self.reply({"ok":True,"saved":str(out),"bytes":out.stat().st_size})
   except Exception as e:return self.reply({"error":str(e)},400)
  self.reply({"error":"Unknown endpoint"},404)
 def scan(self,d):
  global STATE
  try:
   if os.name!="nt":raise RuntimeError("Physical disk scanning requires Windows")
   miss=[x for x,v in toolmap().items() if not v]
   if miss:raise RuntimeError("Install The Sleuth Kit and add its bin folder to PATH. Missing: "+", ".join(miss))
   disk=int(d["disk"]);off=int(d.get("offset",0));a=disks()["drives"]
   dev=next((x for x in a if x["number"]==disk),None)
   if not dev:raise RuntimeError("Drive unavailable")
   if dev["system"] or dev["boot"]:raise RuntimeError("System/boot drive blocked for safety")
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

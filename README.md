# SUPER RECOVERY AutoScan — Windows local recovery agent

Not an upload-only website. A local Python agent inventories physical disks and calls The Sleuth Kit (TSK) tools: `mmls`, `fls`, `icat`, `fsstat`.

## Requirements
- Windows 10/11, Python 3.10+
- Install trusted Windows binaries for The Sleuth Kit and add its `bin` folder to PATH. Verify `mmls -V`, `fls -V`, `icat -V`, `fsstat -V`.
- Run elevated as Administrator for raw physical disk access.

## Run
1. Extract ZIP; install Python and TSK.
2. Connect the target storage device.
3. Run `Start-Super-Recovery-as-Admin.bat`.
4. Open `http://127.0.0.1:8765`.
5. Select a non-system disk. Click Find partitions, select a partition start sector, then Start deleted-file scan.
6. Select deleted entries and recover to an existing folder on a different healthy drive.

## GitHub Pages limitation
GitHub Pages cannot access physical disk sectors. The actual recovery engine runs locally using `server.py`; this agent serves the UI on localhost to avoid exposing a local API to arbitrary websites. Static files can still be uploaded to GitHub as a product front end, but physical recovery requires the local agent.

## Safety and limitations
Source access is read-only; extracted files are written to the destination. System/boot disks are blocked. This is an initial TSK integration, not a complete Autopsy replacement. Recovery depends on intact filesystem metadata and TSK filesystem support. It cannot guarantee recovery of overwritten data, SSD TRIMmed blocks, fragmented files, encrypted volumes or physically damaged media. Image failing drives before repeated scans; stop if clicking/disconnecting. Keep the agent bound to 127.0.0.1; do not expose it publicly.

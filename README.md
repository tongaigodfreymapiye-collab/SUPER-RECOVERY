# SUPER RECOVERY — Windows Local Forensic Recovery Station

SUPER RECOVERY is a local-first Windows forensic recovery interface. The GitHub Pages copy is only a static landing/interface; it cannot inspect the computer's disks. **Run the Windows local agent and use `http://127.0.0.1:8765` for actual device detection, scanning and recovery.**

## 1. Requirements

- Windows 10 or Windows 11
- Python 3.10 or newer
- The Sleuth Kit (TSK) Windows build installed from a trusted source
- TSK `bin` folder added to the Windows PATH; the required commands are `mmls`, `fls`, `icat`, and `fsstat`
- Administrator permissions for raw physical disk access

Verify in PowerShell:

```powershell
mmls -V
fls -V
icat -V
fsstat -V
```

If a command is not found, install TSK and add its `bin` directory to PATH, then close and reopen the terminal.

## 2. Start the actual local recovery station

1. Extract the entire ZIP to a normal folder (not inside the ZIP viewer).
2. Connect the USB drive, external HDD, memory card reader or other target storage.
3. Double-click `Start-Super-Recovery-as-Admin.bat` and approve the Windows UAC prompt.
4. Keep the black command window open.
5. The app opens at `http://127.0.0.1:8765`.
6. Click **ENABLE SOUND & START** once. The bulldog sniffs for ten seconds, plays three real bark clips, then reveals the developer credit. The browser requires this first click to grant audio permission; browsers do not allow a website to force autoplay with sound before user interaction.
7. The local agent checks for connected disks every five seconds. Connect or disconnect storage and the list updates automatically.
8. Select the target disk. AutoSearch reads the partition map and scans each detected partition for deleted directory entries using TSK `fls`.
9. Select recoverable entries and recover them to a folder on a different healthy disk.

## 3. GitHub Pages vs local engine

GitHub Pages cannot access physical drives, Windows APIs, raw disk sectors or the local filesystem. If you visit the GitHub URL, you will see a notice explaining that the local agent is required. The **Open local recovery station** control opens `http://127.0.0.1:8765`; it only works while the Windows agent is running. The JSON parsing error from the hosted version is handled with a clear message instead of an unhelpful `Unexpected token '<'` error.

Upload the contents of this folder to your repository, including the hidden `.github` directory. Hosting the interface does not host or remotely execute the local forensic engine.

## 4. Engines and forensic capabilities

The currently integrated core engine is **The Sleuth Kit**:
- `mmls`: partition table discovery
- `fls`: deleted file and directory entry enumeration
- `icat`: inode-based file extraction
- `fsstat`: filesystem metadata utility (detected as a required dependency)

The interface also detects optional `tsk_recover`, `photorec`, and `testdisk` installations, but those optional engines are not yet wired into the recovery workflow. This release does not claim to be a full Autopsy replacement, a complete disk-imaging suite, or a universal recovery engine.

## 5. Important limitations and safety

- This version performs metadata-based deleted-entry discovery and inode extraction. It does not yet perform full signature carving for every file format, RAID reconstruction, encrypted-volume bypass, damaged-media repair, or comprehensive mobile-device acquisition.
- Optical CD/DVD drives are detected and displayed, but optical-media recovery is not yet supported by this workflow.
- A Windows system/boot disk can only be scanned after ticking the explicit read-only acknowledgement. A live scan of the running Windows disk can be incomplete or unstable; creating a forensic image first is preferable. Do not use a failing drive repeatedly.
- Never recover files to the source disk. Use a separate healthy destination disk.
- SSD TRIM, overwriting, encryption, fragmentation and physical damage can make recovery impossible. No software can guarantee recovery of overwritten or TRIMmed data.
- For evidential work, preserve chain of custody, document device identifiers and acquisition times, use write blockers where appropriate, and work from a verified forensic image. This app does not currently create or verify forensic images or produce a formal court-ready chain-of-custody report.

## 6. Sound asset

The startup uses a short real dog-bark recording from Wikimedia Commons, released into the public domain by its creator: `George vuf 1996.ogg` by Broadbeer. The browser loads the clip from Wikimedia Commons, so an internet connection is needed for the real bark. The word-by-word credential punctuation uses a locally generated stylised impact sound.

## Developer

Developed by Software Developer and Cybersecurity Engineer — Tongai Godfrey Mapiye — Cyber Fortress Technologies. Copyright 2026.


## One-click recovery and save destination

After AutoSearch finds deleted entries:
1. Choose **Browse…** and select a folder on a different physical drive (for example `E:\Recovered`).
2. Click **One-click recover all found files**.
3. Confirm the operation. The local Windows agent attempts each regular deleted-file candidate in sequence and reports successful saves and failures.
4. The selected destination folder is shown in the recovery results.

The destination is checked against the source physical disk using Windows partition information. Recovery is not guaranteed: deleted entries may be overwritten, fragmented, encrypted, unsupported, or affected by SSD TRIM. For evidence preservation, image the source first and work from the image. This workflow extracts regular file entries via Sleuth Kit `icat`; it is not a complete forensic suite or a substitute for validated forensic acquisition.


## Integrated recovery modes

SUPER RECOVERY now presents the recovery modes in the same interface:

- **Quick Scan**: The Sleuth Kit (`mmls`, `fls`, `icat`, `fsstat`) inspects partitions and deleted file-system entries.
- **Deep Scan**: Runs the Quick Scan first, then starts PhotoRec signature-based carving to the selected destination.
- **Raw Recovery**: Runs PhotoRec directly against the selected physical disk. PhotoRec ignores file-system metadata and can find known file signatures on damaged or reformatted media, but recovered names and folder paths may not be retained.
- **TestDisk partition analysis**: Starts a read-only `analyze,search` pass to look for lost partitions. SUPER RECOVERY does not automatically write repaired partition tables.

### Install optional engines

Install the official Windows TestDisk & PhotoRec package from the CGSecurity website. Extract the complete package to a folder and add that folder to Windows PATH so `photorec_win.exe` and `testdisk_win.exe` can be found. Keep the package's companion DLL files together. Run the local agent as Administrator for physical-media access.

Official documentation:
- https://www.cgsecurity.org/testdisk_doc/photorec.html
- https://www.cgsecurity.org/testdisk_doc/scripted_run.html
- https://www.cgsecurity.org/testdisk_doc/running.html

### Raw recovery workflow

1. Select a physical disk.
2. Choose **Deep Scan** or **Raw Recovery**.
3. Choose an output folder on a different physical disk using **Browse…**.
4. Start the scan and confirm the source/destination warning.
5. PhotoRec writes results into `recup_dir.1`, `recup_dir.2`, etc. under the destination folder.

PhotoRec's scripted mode is used for the raw-recovery engine. Its progress output can be limited depending on the Windows build; the destination `recup_dir.*` folders and PhotoRec log are the authoritative output locations.

### Important limitations

- PhotoRec is an external dependency and is not bundled in this ZIP. The user must install it from its official source.
- PhotoRec may ask for additional choices on some disk layouts or versions. Validate its behavior on a test disk before relying on it for important evidence.
- PhotoRec file carving commonly loses original filenames and directory structure.
- SSD TRIM, overwriting, encryption, fragmentation, unsupported formats and physical damage can prevent recovery.
- For failing media, create a forensic image first and work from the image. Do not run prolonged scans on a physically failing disk.
- The current TestDisk integration performs partition analysis only. It does not automatically write partition repairs.
- This is an evolving forensic recovery workstation, not yet a validated replacement for Autopsy or a certified forensic acquisition suite.

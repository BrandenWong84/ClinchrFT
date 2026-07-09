# Deployment Agent

Purpose

Package the app into a distributable installer and manage releases.

Responsibilities
- Configure Tauri bundling (`tauri.conf.json`) and build scripts.
- Produce Windows `.exe` installer and test on clean VMs.
- Maintain release notes and versioning.

Inputs
- Built app, version number, release checklist

Outputs
- Installer artifacts, release notes, and publishing instructions

Example prompt
"You are the DEPLOYMENT Agent. Create Tauri bundling config for Windows and a checklist to validate installer on a clean Windows VM." 

Checklist
- [ ] Configure `tauri.conf.json` for Windows
- [ ] Build self-contained installer
- [ ] Test installer on clean system

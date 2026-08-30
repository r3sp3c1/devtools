# 🛠️ Raycast DevTools Arsenal

> The ultimate, unapologetic Swiss Army Knife for Sysadmins, DevOps, and Cryptography Nerds on macOS.

Frustrated by basic Raycast extensions that barely scratch the surface of a real terminal workflow? This is a monolithic toolkit built to bridge the gap between heavy infrastructure management, next-gen cryptography, and daily developer utilities—all directly accessible from your Raycast launcher.

## 🚀 Core Features

### 🔐 Advanced Cryptography & Key Management
- **Post-Quantum Ready:** Full UI integration for **Crystals-Kyber** encryption.
- **Modern Standards:** Encrypt/Decrypt files and text using **Age (Rage)**, **Libsodium**, and **AES-256**.
- **GPG/YubiKey Native SSH Manager:** Finally, an SSH manager that doesn't rely on the dumb macOS Apple agent. This extension spawns an isolated ZSH login shell to natively communicate with your `gpg-agent`, flawlessy parsing your YubiKey and Smartcard identities. Load, unload, and copy SSH hashes in one click.

### 🐳 Infrastructure & Virtualization
- **Proxmox Manager:** Control your Proxmox VMs and LXC containers directly.
- **Docker Manager:** Stop, start, and manage local Docker containers without ever touching the terminal.
- **Rclone Dropper:** Instantly drag, drop, and transfer files via Rclone.
- **SCP Transfer:** Seamless file copying across your SSH nodes.

### 🕸️ Networking Toolkit
- **PCAP Sniffer:** Live network packet capturing.
- **Live Bandwidth:** Real-time throughput monitoring.
- **Nmap Scanner & TCP Traceroute:** Map out networks and trace routes instantly.
- **ARP Watch & MAC Spoofer:** Keep an eye on your local network layer.

### 🔧 Developer Utilities
- **JWT Debugger:** Decode and inspect JSON Web Tokens on the fly.
- **Data Formatting:** Convert between JSON, YAML, and Typescript interfaces instantly.
- **Base Converter & CIDR Calc:** IP subnetting and hex/base64/binary translations.
- **Cron Parser:** Human-readable translations for your cronjobs.

---

## ⚙️ Installation

Because this extension uses hardcore cryptography libraries that require strict ESBuild patching, **you cannot just import it blindly**. You must install the NPM dependencies first.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/r3sp3c1/devtools.git
   cd devtools
   ```

2. **Install dependencies (CRITICAL):**
   ```bash
   npm install
   ```
   *Note: This automatically fires a `postinstall` script to patch global variables in `crystals-kyber` so it survives Raycast's strict ESBuild environment.*

3. **Import into Raycast:**
   - Open Raycast
   - Search for **"Import Extension"**
   - Select the `devtools` folder you just cloned.
   - Raycast will build it in the background, and your arsenal is ready.

---

## 📜 License
Licensed under the brutal and unforgiving **GNU GPLv3**. 
If you use this, share alike. 

*Built with anger, RedBull, and pure hatred for macOS defaults.*

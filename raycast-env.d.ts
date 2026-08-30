/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `dashboard` command */
  export type Dashboard = ExtensionPreferences & {
  /** Default Tail/Head Mode - Default mode for the File Tail tool */
  "defaultTailMode": "tail" | "head",
  /** Default Tail/Head Lines - Default number of lines to show */
  "defaultTailLines": string,
  /** Default PCAP Interface - Network interface to sniff (e.g. en0) */
  "pcapInterface": string,
  /** Default PCAP Output Folder - Path to save .pcap files */
  "pcapFolder": string,
  /** PCAP Time Limit (Seconds) - Stop capture after X seconds */
  "pcapTimeLimit": string,
  /** PCAP Size Limit (MB) - Stop capture after X MBs */
  "pcapSizeLimit": string,
  /** SSH Terminal App - Terminal for SSH connections */
  "sshTerminal": "Terminal" | "iTerm",
  /** Default Archive Format - Default format for the Archive Manager */
  "defaultArchiveFormat": "zip" | "tar.gz" | "tar",
  /** Telegram Bot Token - Token for your Telegram Bot (get from @BotFather) */
  "telegramBotToken"?: string,
  /** Telegram Default Chat ID - Default Chat ID or Channel ID to send messages to */
  "telegramChatId"?: string
}
  /** Preferences accessible in the `archive-manager` command */
  export type ArchiveManager = ExtensionPreferences & {}
  /** Preferences accessible in the `arp-watch` command */
  export type ArpWatch = ExtensionPreferences & {}
  /** Preferences accessible in the `base-converter` command */
  export type BaseConverter = ExtensionPreferences & {}
  /** Preferences accessible in the `cidr-calc` command */
  export type CidrCalc = ExtensionPreferences & {}
  /** Preferences accessible in the `composerize-tool` command */
  export type ComposerizeTool = ExtensionPreferences & {}
  /** Preferences accessible in the `cron-parser` command */
  export type CronParser = ExtensionPreferences & {}
  /** Preferences accessible in the `docker-manager` command */
  export type DockerManager = ExtensionPreferences & {}
  /** Preferences accessible in the `fake-data` command */
  export type FakeData = ExtensionPreferences & {}
  /** Preferences accessible in the `file-converter` command */
  export type FileConverter = ExtensionPreferences & {}
  /** Preferences accessible in the `file-inspector` command */
  export type FileInspector = ExtensionPreferences & {}
  /** Preferences accessible in the `file-tail` command */
  export type FileTail = ExtensionPreferences & {}
  /** Preferences accessible in the `google-translate` command */
  export type GoogleTranslate = ExtensionPreferences & {}
  /** Preferences accessible in the `hash-generator` command */
  export type HashGenerator = ExtensionPreferences & {}
  /** Preferences accessible in the `json-formatter` command */
  export type JsonFormatter = ExtensionPreferences & {}
  /** Preferences accessible in the `json-path` command */
  export type JsonPath = ExtensionPreferences & {}
  /** Preferences accessible in the `json-ts` command */
  export type JsonTs = ExtensionPreferences & {}
  /** Preferences accessible in the `json-yaml` command */
  export type JsonYaml = ExtensionPreferences & {}
  /** Preferences accessible in the `jwt-debugger` command */
  export type JwtDebugger = ExtensionPreferences & {}
  /** Preferences accessible in the `live-bandwidth` command */
  export type LiveBandwidth = ExtensionPreferences & {}
  /** Preferences accessible in the `lorem-ipsum` command */
  export type LoremIpsum = ExtensionPreferences & {}
  /** Preferences accessible in the `mac-spoofer` command */
  export type MacSpoofer = ExtensionPreferences & {}
  /** Preferences accessible in the `markdown-preview` command */
  export type MarkdownPreview = ExtensionPreferences & {}
  /** Preferences accessible in the `nmap-scanner` command */
  export type NmapScanner = ExtensionPreferences & {}
  /** Preferences accessible in the `pcap-sniffer` command */
  export type PcapSniffer = ExtensionPreferences & {}
  /** Preferences accessible in the `proxmox-manager` command */
  export type ProxmoxManager = ExtensionPreferences & {}
  /** Preferences accessible in the `rclone-dropper` command */
  export type RcloneDropper = ExtensionPreferences & {}
  /** Preferences accessible in the `scp-transfer` command */
  export type ScpTransfer = ExtensionPreferences & {}
  /** Preferences accessible in the `sql-formatter` command */
  export type SqlFormatter = ExtensionPreferences & {}
  /** Preferences accessible in the `sqlite-explorer` command */
  export type SqliteExplorer = ExtensionPreferences & {}
  /** Preferences accessible in the `ssh-keygen` command */
  export type SshKeygen = ExtensionPreferences & {}
  /** Preferences accessible in the `ssh-manager` command */
  export type SshManager = ExtensionPreferences & {}
  /** Preferences accessible in the `ssh-navigator` command */
  export type SshNavigator = ExtensionPreferences & {}
  /** Preferences accessible in the `ssl-inspector` command */
  export type SslInspector = ExtensionPreferences & {}
  /** Preferences accessible in the `string-case` command */
  export type StringCase = ExtensionPreferences & {}
  /** Preferences accessible in the `systemd-creator` command */
  export type SystemdCreator = ExtensionPreferences & {}
  /** Preferences accessible in the `tcp-traceroute` command */
  export type TcpTraceroute = ExtensionPreferences & {}
  /** Preferences accessible in the `telegram-sender` command */
  export type TelegramSender = ExtensionPreferences & {}
  /** Preferences accessible in the `unix-time` command */
  export type UnixTime = ExtensionPreferences & {}
  /** Preferences accessible in the `url-parser` command */
  export type UrlParser = ExtensionPreferences & {}
  /** Preferences accessible in the `wlan-courier` command */
  export type WlanCourier = ExtensionPreferences & {}
  /** Preferences accessible in the `wol-sniper` command */
  export type WolSniper = ExtensionPreferences & {}
  /** Preferences accessible in the `list-keys` command */
  export type ListKeys = ExtensionPreferences & {}
  /** Preferences accessible in the `generate-key` command */
  export type GenerateKey = ExtensionPreferences & {}
  /** Preferences accessible in the `encrypt` command */
  export type Encrypt = ExtensionPreferences & {}
  /** Preferences accessible in the `decrypt` command */
  export type Decrypt = ExtensionPreferences & {}
  /** Preferences accessible in the `sign` command */
  export type Sign = ExtensionPreferences & {}
  /** Preferences accessible in the `verify` command */
  export type Verify = ExtensionPreferences & {}
  /** Preferences accessible in the `import-key` command */
  export type ImportKey = ExtensionPreferences & {}
  /** Preferences accessible in the `quick-encrypt-aes` command */
  export type QuickEncryptAes = ExtensionPreferences & {}
  /** Preferences accessible in the `quick-encrypt-kyber` command */
  export type QuickEncryptKyber = ExtensionPreferences & {}
  /** Preferences accessible in the `quick-encrypt-libsodium` command */
  export type QuickEncryptLibsodium = ExtensionPreferences & {}
  /** Preferences accessible in the `quick-decrypt` command */
  export type QuickDecrypt = ExtensionPreferences & {
  /** Default Age Key - The name or ID of the default Age key to use for quick decryption. */
  "defaultAgeKey"?: string
}
}

declare namespace Arguments {
  /** Arguments passed to the `dashboard` command */
  export type Dashboard = {}
  /** Arguments passed to the `archive-manager` command */
  export type ArchiveManager = {}
  /** Arguments passed to the `arp-watch` command */
  export type ArpWatch = {}
  /** Arguments passed to the `base-converter` command */
  export type BaseConverter = {}
  /** Arguments passed to the `cidr-calc` command */
  export type CidrCalc = {}
  /** Arguments passed to the `composerize-tool` command */
  export type ComposerizeTool = {}
  /** Arguments passed to the `cron-parser` command */
  export type CronParser = {}
  /** Arguments passed to the `docker-manager` command */
  export type DockerManager = {}
  /** Arguments passed to the `fake-data` command */
  export type FakeData = {}
  /** Arguments passed to the `file-converter` command */
  export type FileConverter = {}
  /** Arguments passed to the `file-inspector` command */
  export type FileInspector = {}
  /** Arguments passed to the `file-tail` command */
  export type FileTail = {}
  /** Arguments passed to the `google-translate` command */
  export type GoogleTranslate = {}
  /** Arguments passed to the `hash-generator` command */
  export type HashGenerator = {}
  /** Arguments passed to the `json-formatter` command */
  export type JsonFormatter = {}
  /** Arguments passed to the `json-path` command */
  export type JsonPath = {}
  /** Arguments passed to the `json-ts` command */
  export type JsonTs = {}
  /** Arguments passed to the `json-yaml` command */
  export type JsonYaml = {}
  /** Arguments passed to the `jwt-debugger` command */
  export type JwtDebugger = {}
  /** Arguments passed to the `live-bandwidth` command */
  export type LiveBandwidth = {}
  /** Arguments passed to the `lorem-ipsum` command */
  export type LoremIpsum = {}
  /** Arguments passed to the `mac-spoofer` command */
  export type MacSpoofer = {}
  /** Arguments passed to the `markdown-preview` command */
  export type MarkdownPreview = {}
  /** Arguments passed to the `nmap-scanner` command */
  export type NmapScanner = {}
  /** Arguments passed to the `pcap-sniffer` command */
  export type PcapSniffer = {}
  /** Arguments passed to the `proxmox-manager` command */
  export type ProxmoxManager = {}
  /** Arguments passed to the `rclone-dropper` command */
  export type RcloneDropper = {}
  /** Arguments passed to the `scp-transfer` command */
  export type ScpTransfer = {}
  /** Arguments passed to the `sql-formatter` command */
  export type SqlFormatter = {}
  /** Arguments passed to the `sqlite-explorer` command */
  export type SqliteExplorer = {}
  /** Arguments passed to the `ssh-keygen` command */
  export type SshKeygen = {}
  /** Arguments passed to the `ssh-manager` command */
  export type SshManager = {}
  /** Arguments passed to the `ssh-navigator` command */
  export type SshNavigator = {}
  /** Arguments passed to the `ssl-inspector` command */
  export type SslInspector = {}
  /** Arguments passed to the `string-case` command */
  export type StringCase = {}
  /** Arguments passed to the `systemd-creator` command */
  export type SystemdCreator = {}
  /** Arguments passed to the `tcp-traceroute` command */
  export type TcpTraceroute = {}
  /** Arguments passed to the `telegram-sender` command */
  export type TelegramSender = {}
  /** Arguments passed to the `unix-time` command */
  export type UnixTime = {}
  /** Arguments passed to the `url-parser` command */
  export type UrlParser = {}
  /** Arguments passed to the `wlan-courier` command */
  export type WlanCourier = {}
  /** Arguments passed to the `wol-sniper` command */
  export type WolSniper = {}
  /** Arguments passed to the `list-keys` command */
  export type ListKeys = {}
  /** Arguments passed to the `generate-key` command */
  export type GenerateKey = {}
  /** Arguments passed to the `encrypt` command */
  export type Encrypt = {}
  /** Arguments passed to the `decrypt` command */
  export type Decrypt = {}
  /** Arguments passed to the `sign` command */
  export type Sign = {}
  /** Arguments passed to the `verify` command */
  export type Verify = {}
  /** Arguments passed to the `import-key` command */
  export type ImportKey = {}
  /** Arguments passed to the `quick-encrypt-aes` command */
  export type QuickEncryptAes = {}
  /** Arguments passed to the `quick-encrypt-kyber` command */
  export type QuickEncryptKyber = {}
  /** Arguments passed to the `quick-encrypt-libsodium` command */
  export type QuickEncryptLibsodium = {}
  /** Arguments passed to the `quick-decrypt` command */
  export type QuickDecrypt = {}
}


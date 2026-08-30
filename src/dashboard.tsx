import { List, ActionPanel, Action, Icon } from "@raycast/api";
import React from "react";

// Silence annoying NodeJS punycode deprecation warnings
(process as any).noDeprecation = true;
import JsonpathComp from "./json-path";
import CidrcalcComp from "./cidr-calc";
import SqliteexplorerComp from "./sqlite-explorer";
import TcptracerouteComp from "./tcp-traceroute";
import DockermanagerComp from "./docker-manager";
import ProxmoxmanagerComp from "./proxmox-manager";
import FakedataComp from "./fake-data";
import FileinspectorComp from "./file-inspector";
import FiletailComp from "./file-tail";
import ArchivemanagerComp from "./archive-manager";
import PcapsnifferComp from "./pcap-sniffer";
import SshkeygenComp from "./ssh-keygen";
import SshmanagerComp from "./ssh-manager";
import MacspooferComp from "./mac-spoofer";
import LivebandwidthComp from "./live-bandwidth";
import FileconverterComp from "./file-converter";
import ArpwatchComp from "./arp-watch";
import NmapscannerComp from "./nmap-scanner";
import SslinspectorComp from "./ssl-inspector";
import WolsniperComp from "./wol-sniper";
import UrlparserComp from "./url-parser";
import ScptransferComp from "./scp-transfer";
import CronparserComp from "./cron-parser";
import JsontsComp from "./json-ts";
import MarkdownpreviewComp from "./markdown-preview";
import JsonformatterComp from "./json-formatter";
import SqlformatterComp from "./sql-formatter";
import JsonyamlComp from "./json-yaml";
import BaseconverterComp from "./base-converter";
import JwtdebuggerComp from "./jwt-debugger";
import HashgeneratorComp from "./hash-generator";
import LoremipsumComp from "./lorem-ipsum";
import StringcaseComp from "./string-case";
import UnixtimeComp from "./unix-time";
import ComposerizeComp from "./composerize-tool";
import SystemdcreatorComp from "./systemd-creator";
import TelegramsenderComp from "./telegram-sender";
import WlancourierComp from "./wlan-courier";
import RclonedropperComp from "./rclone-dropper";
import GoogletranslateComp from "./google-translate";
import ListkeysComp from "./list-keys";
import GeneratekeyComp from "./generate-key";
import EncryptComp from "./encrypt";
import DecryptComp from "./decrypt";
import SignComp from "./sign";
import VerifyComp from "./verify";
import ImportkeyComp from "./import-key";


export default function Command() {
  return (
    <List
      navigationTitle="DevTools Dashboard"
      searchBarPlaceholder="Search tools..."
    >
      <List.Item title="Google Translate (Free)" icon={Icon.Globe} actions={<ActionPanel><Action.Push title="Open" target={<GoogletranslateComp />} /></ActionPanel>} />
      <List.Item title="Rclone Secure Dropper" icon={Icon.HardDrive} actions={<ActionPanel><Action.Push title="Open" target={<RclonedropperComp />} /></ActionPanel>} />
      <List.Item title="WLAN-Kurier (QR Share)" icon={Icon.Wifi} actions={<ActionPanel><Action.Push title="Open" target={<WlancourierComp />} /></ActionPanel>} />
      <List.Item title="Telegram Bot Sender" icon={Icon.Message} actions={<ActionPanel><Action.Push title="Open" target={<TelegramsenderComp />} /></ActionPanel>} />
      <List.Item title="Docker Run ⇄ Compose (Composerize)" icon={Icon.Box} actions={<ActionPanel><Action.Push title="Open" target={<ComposerizeComp />} /></ActionPanel>} />
      <List.Item title="Systemd Service Creator" icon={Icon.Terminal} actions={<ActionPanel><Action.Push title="Open" target={<SystemdcreatorComp />} /></ActionPanel>} />
      <List.Item
        title="JSON-Path Evaluator"
        icon={Icon.Code}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<JsonpathComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="CIDR Subnet Calculator"
        icon={Icon.Desktop}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<CidrcalcComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="SQLite / Local DB Explorer"
        icon={Icon.HardDrive}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<SqliteexplorerComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Live Traceroute (UDP Stream)"
        icon={Icon.LevelMeter}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<TcptracerouteComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Docker Remote Manager (SSH)"
        icon={Icon.Box}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<DockermanagerComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Proxmox Commander (SSH)"
        icon={Icon.HardDrive}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<ProxmoxmanagerComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Fake Data Generator"
        icon={Icon.Person}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<FakedataComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="File Inspector (Magic Bytes & Hex)"
        icon={Icon.Document}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<FileinspectorComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Live File Tail / Head"
        icon={Icon.Terminal}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<FiletailComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Archive Manager (ZIP/TAR)"
        icon={Icon.Document}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<ArchivemanagerComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="PCAP Network Sniffer (Root)"
        icon={Icon.Eye}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<PcapsnifferComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="SSH Key Generator (ECDSA/RSA)"
        icon={Icon.Key}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<SshkeygenComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="SSH Session Manager (Keys & Servers)"
        icon={Icon.Terminal}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<SshmanagerComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="MAC Address Spoofer (Root)"
        icon={Icon.Mask}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<MacspooferComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Live Interface Bandwidth"
        icon={Icon.LevelMeter}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<LivebandwidthComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Universal File Converter (to PDF/IMG)"
        icon={Icon.Document}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<FileconverterComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="ARP Watch (Local IPs & MACs)"
        icon={Icon.Desktop}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<ArpwatchComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Nmap Scanner (OS & Ports)"
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<NmapscannerComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="SSL Certificate Inspector"
        icon={Icon.Lock}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<SslinspectorComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Wake-on-LAN Sniper"
        icon={Icon.Bolt}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<WolsniperComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="URL Parser & Encoder"
        icon={Icon.Link}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<UrlparserComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="SCP File Transfer"
        icon={Icon.Upload}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<ScptransferComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Cron Job Parser"
        icon={Icon.Clock}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<CronparserComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="JSON to TypeScript"
        icon={Icon.Code}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<JsontsComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Markdown Previewer"
        icon={Icon.TextDocument}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<MarkdownpreviewComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Format JSON"
        icon={Icon.Code}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<JsonformatterComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Format SQL"
        icon={Icon.Code}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<SqlformatterComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="JSON ⇄ YAML"
        icon={Icon.Document}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<JsonyamlComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Number Base Converter"
        icon={Icon.Calculator}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<BaseconverterComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="JWT Debugger"
        icon={Icon.Lock}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<JwtdebuggerComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Hash Generator"
        icon={Icon.Shield}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<HashgeneratorComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Lorem Ipsum"
        icon={Icon.Text}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<LoremipsumComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="String Case Converter"
        icon={Icon.Text}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<StringcaseComp />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Unix Time Converter"
        icon={Icon.Clock}
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<UnixtimeComp />} />
          </ActionPanel>
        }
      />
    
      <List.Item title="List Keys (GPG/AES/Kyber/Age)" icon={Icon.Key} actions={<ActionPanel><Action.Push title="Open" target={<ListkeysComp />} /></ActionPanel>} />
      <List.Item title="Generate Key" icon={Icon.Plus} actions={<ActionPanel><Action.Push title="Open" target={<GeneratekeyComp />} /></ActionPanel>} />
      <List.Item title="Encrypt File/Text" icon={Icon.Lock} actions={<ActionPanel><Action.Push title="Open" target={<EncryptComp />} /></ActionPanel>} />
      <List.Item title="Decrypt File/Text" icon={Icon.LockUnlocked} actions={<ActionPanel><Action.Push title="Open" target={<DecryptComp />} /></ActionPanel>} />
      <List.Item title="Sign File/Text" icon={Icon.Pencil} actions={<ActionPanel><Action.Push title="Open" target={<SignComp />} /></ActionPanel>} />
      <List.Item title="Verify Signature" icon={Icon.Checkmark} actions={<ActionPanel><Action.Push title="Open" target={<VerifyComp />} /></ActionPanel>} />
      <List.Item title="Import Key" icon={Icon.Download} actions={<ActionPanel><Action.Push title="Open" target={<ImportkeyComp />} /></ActionPanel>} />
</List>
  );
}

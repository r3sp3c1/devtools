import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getSelectedFinderItems,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import http from "http";
import os from "os";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import QRCode from "qrcode";

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

export default function Command() {
  const [markdown, setMarkdown] = useState("# Initializing...");
  const [url, setUrl] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const serverRef = useRef<http.Server | null>(null);
  const tempFileRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const startServer = async () => {
      try {
        const items = await getSelectedFinderItems();
        if (!items || items.length === 0) {
          setMarkdown("### ⚠️ No files selected\nPlease select a file or folder in Finder first.");
          return;
        }

        let fileToServe = "";
        let originalName = "";

        // If multiple items, or a single directory, zip it
        if (items.length > 1 || fs.statSync(items[0].path).isDirectory()) {
          const zipName = `Transfer-${Date.now()}.zip`;
          const zipPath = path.join(os.tmpdir(), zipName);
          tempFileRef.current = zipPath;
          fileToServe = zipPath;
          originalName = zipName;

          const pathsToZip = items.map(i => `"${path.basename(i.path)}"`).join(" ");
          const parentDir = path.dirname(items[0].path);
          execSync(`zip -rq "${zipPath}" ${pathsToZip}`, { cwd: parentDir });
        } else {
          fileToServe = items[0].path;
          originalName = path.basename(fileToServe);
        }

        const server = http.createServer((req, res) => {
          if (!active) return;
          
          try {
            const stat = fs.statSync(fileToServe);
            res.writeHead(200, {
              "Content-Type": "application/octet-stream",
              "Content-Length": stat.size,
              "Content-Disposition": `attachment; filename="${originalName}"`,
            });

            const readStream = fs.createReadStream(fileToServe);
            readStream.pipe(res);

            // Close server automatically after transfer finishes
            readStream.on("end", () => {
              if (active) {
                setTimeout(() => {
                  server.close();
                  setIsFinished(true);
                  if (tempFileRef.current && fs.existsSync(tempFileRef.current)) {
                    fs.unlinkSync(tempFileRef.current);
                    tempFileRef.current = null;
                  }
                }, 1000);
              }
            });
          } catch (e) {
            res.writeHead(500);
            res.end("Internal Server Error");
          }
        });

        serverRef.current = server;
        server.listen(0, "0.0.0.0", async () => {
          if (!active) return;
          const port = (server.address() as any).port;
          const localIp = getLocalIp();
          const targetUrl = `http://${localIp}:${port}`;
          setUrl(targetUrl);

          // Generate QR Code data URI
          const qrDataUrl = await QRCode.toDataURL(targetUrl, { width: 300, margin: 2 });
          
          setMarkdown(`
# 📦 WLAN-Kurier
**File ready for transfer:** \`${originalName}\`

Scan this QR Code with your smartphone, or open the link on another device in the same network:
[${targetUrl}](${targetUrl})

![QR Code](${qrDataUrl})

*The server will automatically shut down after 1 successful download!*
          `);
        });

      } catch (err) {
        if (active) setMarkdown("### ⚠️ Error\nCould not access Finder items or start server.");
      }
    };

    startServer();

    return () => {
      active = false;
      if (serverRef.current) serverRef.current.close();
      if (tempFileRef.current && fs.existsSync(tempFileRef.current)) {
        try {
          fs.unlinkSync(tempFileRef.current);
        } catch(e){}
      }
    };
  }, []);

  if (isFinished) {
    return (
      <Detail
        markdown={`# ✅ Transfer Complete!\n\nYour file was successfully downloaded. The local server has been securely shut down.`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content="done" title="Close" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {url && <Action.CopyToClipboard content={url} title="Copy Link" />}
        </ActionPanel>
      }
    />
  );
}

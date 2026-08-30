import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import React from "react";

interface Preferences {
  pcapInterface: string;
  pcapFolder: string;
  pcapTimeLimit: string;
  pcapSizeLimit: string;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [output, setOutput] = useState<string>("Ready to capture.");
  const [lastCaptureFile, setLastCaptureFile] = useState<string>("");

  const lastCaptureFileRef = React.useRef<string>("");
  const isCapturingRef = React.useRef<boolean>(false);

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  useEffect(() => {
    // Keep UI state in sync. Bash script handles renaming and size limits natively.
    const check = setInterval(() => {
      exec("pgrep tcpdump", (err, stdout) => {
        const running = !!stdout.trim();
        if (isCapturingRef.current && !running) {
          setIsCapturing(false);
          setOutput(
            "✅ Capture finished/stopped. You can now open the file in Wireshark!",
          );
        }
      });
    }, 2000);
    return () => clearInterval(check);
  }, []);

  const startCapture = async (values: {
    netInterface: string;
    folder: string;
    timeLimit: string;
    sizeLimit: string;
  }) => {
    if (!values.netInterface) {
      showToast({ style: Toast.Style.Failure, title: "Interface is required" });
      return;
    }
    if (!values.folder) {
      showToast({ style: Toast.Style.Failure, title: "Folder is required" });
      return;
    }

    const resolvedFolder = values.folder.replace(/^~/, process.env.HOME || "");
    if (!fs.existsSync(resolvedFolder)) {
      showToast({
        style: Toast.Style.Failure,
        title: `Folder not found: ${resolvedFolder}`,
      });
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `capture-${values.netInterface}-${timestamp}.pcap`;
    const fullPath = path.join(resolvedFolder, filename);
    const tempPath = fullPath + ".inprogress";

    setLastCaptureFile(fullPath);
    lastCaptureFileRef.current = fullPath;

    let script = `/usr/sbin/tcpdump -U -i ${values.netInterface} -w "${tempPath}"`;
    if (values.timeLimit) {
      script += ` -G ${values.timeLimit} -W 1`;
    }

    // Background the tcpdump process and grab its PID
    script += ` & TCP_PID=$! ;`;

    // Add size limit monitor if configured
    if (values.sizeLimit) {
      const sizeBytes = parseFloat(values.sizeLimit) * 1024 * 1024;
      script += `
      while kill -0 $TCP_PID 2>/dev/null; do
        size=$(stat -f%z "${tempPath}" 2>/dev/null || echo 0);
        if [ $size -ge ${sizeBytes} ]; then
          kill $TCP_PID 2>/dev/null;
          break;
        fi;
        sleep 1;
      done;
      `;
    }

    // Wait for tcpdump to completely flush/close, then rename the file natively
    script += ` wait $TCP_PID 2>/dev/null; mv "${tempPath}" "${fullPath}";`;

    const fullCmd = `nohup bash -c '${script.replace(/\n/g, " ")}' > /dev/null 2>&1 &`;

    // INSTANT LOCK to prevent multiple clicks/spams
    setIsCapturing(true);

    setOutput(
      `Starting capture on ${values.netInterface}...\nFile: ${fullPath}\n\n⏳ RUNNING...`,
    );
    showToast({ style: Toast.Style.Animated, title: "Starting Capture..." });

    exec(fullCmd, (error) => {
      if (error) {
        setIsCapturing(false);
        setOutput(`Error: ${error.message}\n\nCommand Executed:\n${fullCmd}`);
        showToast({
          style: Toast.Style.Failure,
          title: "Capture Error",
          message: "See status below.",
        });
      } else {
        setOutput(
          `✅ RUNNING on ${values.netInterface} (Promiscuous Mode)\n\nSaving to:\n${fullPath}\n\nLimits:\nTime: ${values.timeLimit}s\nSize: ${values.sizeLimit}MB\n\n(It will stop automatically, or click Stop below)`,
        );
        showToast({ style: Toast.Style.Success, title: "Capture Started" });
      }
    });
  };

  const stopCapture = () => {
    setOutput("Stopping tcpdump...");
    exec("killall tcpdump", (error) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to kill tcpdump",
        });
        setOutput("Failed to kill tcpdump. Maybe it wasn't running?");
      }
      // We DO NOT rename here or set isCapturing(false).
      // The bash script guarantees the rename, and the interval handles isCapturing(false).
    });
  };

  const openInWireshark = () => {
    if (!lastCaptureFile || !fs.existsSync(lastCaptureFile)) {
      showToast({ style: Toast.Style.Failure, title: "File not found" });
      return;
    }
    exec(`open -a Wireshark "${lastCaptureFile}"`, (err) => {
      if (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Wireshark not found",
          message: "Make sure Wireshark is installed in Applications.",
        });
      }
    });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          {!isCapturing && (
            <Action.SubmitForm
              title="Start PCAP Capture"
              icon={Icon.Play}
              onSubmit={startCapture}
            />
          )}
          {isCapturing && (
            <Action
              title="Stop Capture"
              icon={Icon.Stop}
              onAction={stopCapture}
            />
          )}
          {lastCaptureFile && !isCapturing && (
            <Action
              title="Open PCAP in Wireshark"
              icon={Icon.Eye}
              onAction={openInWireshark}
            />
          )}
          {lastCaptureFile && (
            <Action.ShowInFinder
              title="Show File in Finder"
              path={lastCaptureFile}
            />
          )}

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Status Output"
              icon={Icon.Clipboard}
              content={output}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="netInterface"
        title="Interface"
        defaultValue={prefs.pcapInterface || "en0"}
      />
      <Form.TextField
        id="folder"
        title="Output Folder"
        defaultValue={prefs.pcapFolder || "~/Downloads"}
      />

      <Form.Separator />

      <Form.TextField
        id="timeLimit"
        title="Time Limit (Seconds)"
        defaultValue={prefs.pcapTimeLimit || "60"}
      />
      <Form.TextField
        id="sizeLimit"
        title="Size Limit (MB)"
        defaultValue={prefs.pcapSizeLimit || "100"}
      />

      <Form.Separator />

      <Form.Description title="Status" text={output} />
    </Form>
  );
}

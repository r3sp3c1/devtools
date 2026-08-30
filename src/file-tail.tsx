import {
  Form,
  ActionPanel,
  Action,
  getSelectedFinderItems,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fs from "fs";
import { exec } from "child_process";
import React from "react";

interface Preferences {
  defaultTailMode: string;
  defaultTailLines: string;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [filePath, setFilePath] = useState<string[]>([]);
  const [linesCount, setLinesCount] = useState<string>(
    prefs.defaultTailLines || "50",
  );
  const [mode, setMode] = useState<string>(prefs.defaultTailMode || "tail");
  const [content, setContent] = useState<string>("");

  const watcherRef = useRef<fs.FSWatcher | null>(null);

  const updateContent = (path: string, numStr: string, m: string) => {
    if (!path || !fs.existsSync(path)) {
      setContent("File not found or not selected.");
      return;
    }
    const num = parseInt(numStr, 10) || 50;
    // Using native tail/head commands for maximum performance on huge logs
    const cmd =
      m === "tail" ? `tail -n ${num} "${path}"` : `head -n ${num} "${path}"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        setContent(`Error: ${stderr || error.message}`);
      } else {
        setContent(stdout);
      }
    });
  };

  const handleFileChange = (paths: string[]) => {
    if (watcherRef.current) {
      watcherRef.current.close();
      watcherRef.current = null;
    }

    if (!paths || paths.length === 0) {
      setContent("");
      return;
    }

    const path = paths[0];
    updateContent(path, linesCount, mode);

    // Setup live watch
    try {
      watcherRef.current = fs.watch(path, (eventType) => {
        if (eventType === "change") {
          updateContent(path, linesCount, mode);
        }
      });
    } catch (e) {
      console.error("Watch error", e);
    }
  };

  useEffect(() => {
    async function fetchSelected() {
      try {
        const items = await getSelectedFinderItems();
        if (items && items.length > 0) {
          const path = items[0].path;
          setFilePath([path]);
          handleFileChange([path]);
        }
      } catch (e) {
        // No selection
      }
    }
    fetchSelected();

    return () => {
      if (watcherRef.current) watcherRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (filePath.length > 0) {
      updateContent(filePath[0], linesCount, mode);
    }
  }, [linesCount, mode]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Content" content={content} />
          <Action
            title="Refresh Now"
            onAction={() =>
              filePath.length > 0 &&
              updateContent(filePath[0], linesCount, mode)
            }
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Select File"
        value={filePath}
        onChange={(val) => {
          setFilePath(val);
          handleFileChange(val);
        }}
        allowMultipleSelection={false}
      />
      <Form.Dropdown id="mode" title="Mode" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value="tail" title="Tail (Bottom Lines)" />
        <Form.Dropdown.Item value="head" title="Head (Top Lines)" />
      </Form.Dropdown>
      <Form.TextField
        id="lines"
        title="Number of Lines"
        value={linesCount}
        onChange={setLinesCount}
      />
      <Form.Separator />
      <Form.TextArea
        id="content"
        title="Live Content"
        value={content}
        onChange={setContent}
      />
    </Form>
  );
}

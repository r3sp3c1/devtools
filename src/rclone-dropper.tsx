import {
  List,
  ActionPanel,
  Action,
  Icon,
  Form,
  showToast,
  Toast,
  useNavigation,
  getSelectedFinderItems,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";

// --- MAIN COMPONENT ---
export default function Command() {
  const [remotes, setRemotes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRemotes = () => {
    setIsLoading(true);
    exec("rclone listremotes", (err, stdout) => {
      setIsLoading(false);
      if (!err) {
        const list = stdout
          .split("\n")
          .map((r) => r.trim())
          .filter((r) => r !== "");
        setRemotes(list);
      }
    });
  };

  useEffect(() => {
    fetchRemotes();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select an rclone remote...">
      {remotes.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No remotes found"
          description="Create your first remote."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Crypt Remote"
                icon={Icon.Plus}
                target={<CreateRemoteForm onCreated={fetchRemotes} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        remotes.map((remote) => (
          <List.Item
            key={remote}
            title={remote}
            icon={Icon.HardDrive}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Upload / Sync Files"
                  icon={Icon.Upload}
                  target={<UploadForm remote={remote} />}
                />
                <Action.Push
                  title="Add Crypt Remote"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<CreateRemoteForm onCreated={fetchRemotes} />}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// --- UPLOAD FORM ---
function UploadForm({ remote }: { remote: string }) {
  const { pop } = useNavigation();
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [mode, setMode] = useState<string>("copy");
  const [destPath, setDestPath] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFinderFiles = async () => {
      try {
        const items = await getSelectedFinderItems();
        if (items && items.length > 0) {
          setFilePaths(items.map((i) => i.path));
        }
      } catch (e) {
        // ignore
      }
    };
    fetchFinderFiles();
  }, []);

  const handleUpload = async () => {
    if (filePaths.length === 0) {
      showToast(Toast.Style.Failure, "No files selected", "Please add files to upload.");
      return;
    }

    setIsLoading(true);
    const toast = await showToast(Toast.Style.Animated, "Starting Rclone...");

    try {
      // If uploading multiple files, we should ideally loop.
      // But rclone copy can take a file or a folder.
      // For multiple items, we run them sequentially or in parallel.
      
      let successCount = 0;
      let targetRemote = remote;
      
      // If user typed a subfolder, append it
      if (destPath) {
        let cleanDest = destPath.startsWith("/") ? destPath.substring(1) : destPath;
        if (!targetRemote.endsWith(":")) {
          targetRemote += ":";
        }
        targetRemote += cleanDest;
      }

      for (const rawPath of filePaths) {
        let localPath = rawPath.trim();
        if (localPath.startsWith('"') && localPath.endsWith('"')) {
          localPath = localPath.slice(1, -1);
        }

        if (!fs.existsSync(localPath)) {
          toast.message = `File not found: ${localPath}`;
          continue;
        }

        const stat = fs.statSync(localPath);
        
        let finalRemote = targetRemote;
        // If it's a file, we want to copy it INTO the remote folder.
        // rclone copyto /path/to/file.txt remote:/folder/file.txt
        // Or rclone copy /path/to/folder remote:/folder
        
        let cmd = "";
        if (stat.isFile()) {
           const fileName = path.basename(localPath);
           const remoteFilePath = finalRemote.endsWith("/") ? `${finalRemote}${fileName}` : `${finalRemote}/${fileName}`;
           cmd = `rclone copyto "${localPath}" "${remoteFilePath}"`;
        } else {
           // It's a directory
           // rclone copy /local/dir remote:/dest/dir
           const folderName = path.basename(localPath);
           const remoteDirPath = finalRemote.endsWith("/") ? `${finalRemote}${folderName}` : `${finalRemote}/${folderName}`;
           cmd = `rclone ${mode} "${localPath}" "${remoteDirPath}"`;
        }

        toast.message = `Processing: ${path.basename(localPath)}`;
        
        await new Promise((resolve, reject) => {
          exec(cmd, (err, stdout, stderr) => {
            if (err) return reject(err);
            resolve(stdout);
          });
        });
        
        successCount++;
      }

      toast.style = Toast.Style.Success;
      toast.title = "Transfer Complete";
      toast.message = `Transferred ${successCount} items to ${remote}`;
      pop();
    } catch (e: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Rclone Error";
      toast.message = e.message;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Upload to ${remote}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Transfer" onSubmit={handleUpload} icon={Icon.Upload} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Transfer Mode" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value="copy" title="Copy (Safe - Adds/Overwrites files)" />
        <Form.Dropdown.Item value="sync" title="Sync (DANGER - Deletes files on remote not present locally)" />
      </Form.Dropdown>
      
      <Form.TextField
        id="destPath"
        title="Destination Subfolder"
        placeholder="optional/subfolder/"
        value={destPath}
        onChange={setDestPath}
        info={`Will be appended to ${remote}`}
      />

      <Form.TextArea
        id="filePaths"
        title="Local Files / Folders"
        value={filePaths.join("\n")}
        onChange={(val) => setFilePaths(val.split(/[\n,]+/).filter((p) => p.trim() !== ""))}
        info="Auto-filled from Finder. Absolute paths only."
      />
    </Form>
  );
}

// --- CREATE REMOTE FORM ---
function CreateRemoteForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [baseRemote, setBaseRemote] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !baseRemote || !password) {
      showToast(Toast.Style.Failure, "Validation Error", "Name, Base Remote, and Password are required.");
      return;
    }

    setIsLoading(true);
    const toast = await showToast(Toast.Style.Animated, "Creating Crypt Remote...");

    try {
      // Construct the command safely
      let cmd = `rclone config create "${name}" crypt remote "${baseRemote}" password "${password}" --obscure`;
      if (password2) {
        cmd = `rclone config create "${name}" crypt remote "${baseRemote}" password "${password}" password2 "${password2}" --obscure`;
      }

      await new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
          if (err) return reject(err);
          resolve(stdout);
        });
      });

      toast.style = Toast.Style.Success;
      toast.title = "Remote Created!";
      onCreated();
      pop();
    } catch (e: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create remote";
      toast.message = e.message;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Crypt Remote"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Remote" onSubmit={handleCreate} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new encrypted rclone remote." />
      <Form.TextField id="name" title="Remote Name" value={name} onChange={setName} placeholder="gcrypt" />
      <Form.TextField
        id="baseRemote"
        title="Base Remote (Path)"
        value={baseRemote}
        onChange={setBaseRemote}
        placeholder="/Users/name/GoogleDrive/crypt or gdrive:/backup"
      />
      <Form.PasswordField
        id="password"
        title="Password"
        value={password}
        onChange={setPassword}
        placeholder="Strong encryption password"
      />
      <Form.PasswordField
        id="password2"
        title="Salt (Password2)"
        value={password2}
        onChange={setPassword2}
        placeholder="Optional salt password"
      />
    </Form>
  );
}

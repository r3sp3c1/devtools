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
  getFrontmostApplication,
} from "@raycast/api";
import { useCachedState, runAppleScript } from "@raycast/utils";
import { useState, useEffect } from "react";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { v4 as uuidv4 } from "uuid";

interface Bot {
  id: string;
  name: string;
  token: string;
  chatId: string;
}

// --- MAIN LIST COMPONENT ---
export default function Command() {
  const [bots, setBots] = useCachedState<Bot[]>("telegramBots", []);
  const [defaultBotId, setDefaultBotId] = useCachedState<string>("defaultTelegramBotId", "");
  const { push } = useNavigation();

  // If there are bots, sort default to top
  const sortedBots = [...bots].sort((a, b) => {
    if (a.id === defaultBotId) return -1;
    if (b.id === defaultBotId) return 1;
    return 0;
  });

  return (
    <List searchBarPlaceholder="Search bots..." actions={<ActionPanel><Action.Push title="Add Bot" icon={Icon.Plus} target={<BotForm bots={bots} setBots={setBots} />} /></ActionPanel>}>
      {bots.length === 0 ? (
        <List.EmptyView
          title="No Bots found"
          description="Press Enter to add your first Telegram Bot."
          actions={
            <ActionPanel>
              <Action.Push title="Add Bot" icon={Icon.Plus} target={<BotForm bots={bots} setBots={setBots} />} />
            </ActionPanel>
          }
        />
      ) : (
        sortedBots.map((bot) => (
          <List.Item
            key={bot.id}
            title={bot.name}
            subtitle="********" // Hidden Chat ID as requested
            icon={bot.id === defaultBotId ? Icon.Star : Icon.Message}
            accessories={[{ text: bot.id === defaultBotId ? "Default" : "" }]}
            actions={
              <ActionPanel>
                <Action.Push title="Send Message / Files" icon={Icon.AirplaneFilled} target={<SendMessageForm bot={bot} />} />
                {bot.id !== defaultBotId && (
                  <Action title="Set as Default" icon={Icon.Star} onAction={() => setDefaultBotId(bot.id)} />
                )}
                <Action.Push title="Add New Bot" icon={Icon.Plus} target={<BotForm bots={bots} setBots={setBots} />} shortcut={{ modifiers: ["cmd"], key: "n" }} />
                <Action.Push title="Edit Bot" icon={Icon.Pencil} target={<BotForm bots={bots} setBots={setBots} bot={bot} />} shortcut={{ modifiers: ["cmd"], key: "e" }} />
                <Action
                  title="Delete Bot"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => {
                    const newBots = bots.filter((b) => b.id !== bot.id);
                    setBots(newBots);
                    if (defaultBotId === bot.id) setDefaultBotId("");
                    showToast(Toast.Style.Success, "Bot deleted");
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// --- BOT FORM (Add/Edit) ---
function BotForm({ bots, setBots, bot }: { bots: Bot[]; setBots: (bots: Bot[]) => void; bot?: Bot }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(bot?.name || "");
  const [token, setToken] = useState(bot?.token || "");
  const [chatId, setChatId] = useState(bot?.chatId || "");

  const handleSave = () => {
    if (!name || !token || !chatId) {
      showToast(Toast.Style.Failure, "Missing Fields", "Please fill out all fields.");
      return;
    }
    
    if (bot) {
      // Edit
      setBots(bots.map((b) => (b.id === bot.id ? { ...b, name, token, chatId } : b)));
      showToast(Toast.Style.Success, "Bot updated");
    } else {
      // Add
      setBots([...bots, { id: uuidv4(), name, token, chatId }]);
      showToast(Toast.Style.Success, "Bot added");
    }
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bot" icon={Icon.Check} onSubmit={handleSave} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Bot Name" value={name} onChange={setName} placeholder="My Alerts Bot" />
      <Form.PasswordField id="token" title="Bot Token" value={token} onChange={setToken} placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" />
      <Form.TextField id="chatId" title="Chat ID / Channel" value={chatId} onChange={setChatId} placeholder="-100123456789" />
    </Form>
  );
}

// --- SEND MESSAGE FORM ---
function SendMessageForm({ bot }: { bot: Bot }) {
  const { pop } = useNavigation();
  const [message, setMessage] = useState("");
  const [filePaths, setFilePaths] = useState<string[]>([]);
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

  const fetchBrowserUrl = async () => {
    try {
      let frontAppName = "";
      try {
        const frontApp = await getFrontmostApplication();
        frontAppName = frontApp.name;
      } catch(e) {}

      let script = "";
      if (frontAppName === "Google Chrome" || frontAppName === "Brave Browser") {
        script = `tell application "${frontAppName}" to return URL of active tab of front window`;
      } else if (frontAppName === "Safari") {
        script = `tell application "Safari" to return URL of front document`;
      } else if (frontAppName === "Arc") {
        script = `tell application "Arc" to return URL of active tab of front window`;
      } else {
        script = `
          try
            tell application "Google Chrome" to return URL of active tab of front window
          end try
          try
            tell application "Safari" to return URL of front document
          end try
          try
            tell application "Brave Browser" to return URL of active tab of front window
          end try
          try
            tell application "Arc" to return URL of active tab of front window
          end try
          return ""
        `;
      }

      const url = await runAppleScript(script);
      if (url && url.trim() !== "") {
        setMessage((prev) => (prev ? prev + "\n" + url.trim() : url.trim()));
        showToast(Toast.Style.Success, "URL eingefügt!", url.trim());
      } else {
        showToast(Toast.Style.Failure, "Keine URL gefunden", frontAppName ? `Letzte App: ${frontAppName}` : "");
      }
    } catch (e: any) {
      showToast(Toast.Style.Failure, "URL Abruf fehlgeschlagen", e.message);
    }
  };

  const sendTelegram = async () => {
    if (!message.trim() && filePaths.length === 0) {
      showToast(Toast.Style.Failure, "Empty Message", "Please enter a message or select files.");
      return;
    }

    setIsLoading(true);
    const toast = await showToast(Toast.Style.Animated, "Sending...");

    try {
      const baseUrl = `https://api.telegram.org/bot${bot.token}`;

      for (const rawPath of filePaths) {
        let filePath = rawPath.trim();
        let isTempZip = false;

        // Strip quotes if user manually typed them
        if (filePath.startsWith('"') && filePath.endsWith('"')) {
          filePath = filePath.slice(1, -1);
        }

        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          const folderName = path.basename(filePath);
          const zipPath = path.join(os.tmpdir(), `${folderName}-${Date.now()}.zip`);
          execSync(`zip -rq "${zipPath}" "${folderName}"`, { cwd: path.dirname(filePath) });
          filePath = zipPath;
          isTempZip = true;
        }

        const form = new FormData();
        form.append("chat_id", bot.chatId);
        form.append("document", fs.createReadStream(filePath));
        
        if (message.trim() && rawPath === filePaths[0]) {
          form.append("caption", message);
        }

        await axios.post(`${baseUrl}/sendDocument`, form, { 
          headers: form.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });

        if (isTempZip) {
          fs.unlinkSync(filePath);
        }
      }

      if (message.trim() && filePaths.length === 0) {
        await axios.post(`${baseUrl}/sendMessage`, { chat_id: bot.chatId, text: message });
      }

      toast.style = Toast.Style.Success;
      toast.title = "Message sent successfully!";
      pop(); // go back to list
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to send";
      toast.message = error?.response?.data?.description || error.message;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Send via ${bot.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send to Telegram" onSubmit={sendTelegram} icon={Icon.AirplaneFilled} />
          <Action title="Insert Browser URL" shortcut={{ modifiers: ["cmd"], key: "u" }} icon={Icon.Globe} onAction={fetchBrowserUrl} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Sending to Chat ID: ********`} />
      <Form.TextArea
        id="message"
        title="Message (or Caption)"
        value={message}
        onChange={setMessage}
        placeholder="Type your message here..."
        enableMarkdown
      />
      <Form.TextArea
        id="filePaths"
        title="Attached Files/Folders"
        value={filePaths.join("\n")}
        onChange={(val) => setFilePaths(val.split(/[\n,]+/).filter((p) => p.trim() !== ""))}
        info="Auto-filled if you selected items in Finder. Folders will be automatically zipped before sending."
        placeholder="~/Downloads/file1.ext, /tmp/file2.txt"
      />
    </Form>
  );
}

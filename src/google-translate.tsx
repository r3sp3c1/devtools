import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import axios from "axios";

export default function Command() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [to, setTo] = useState("de");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    Clipboard.readText().then((clipText) => {
      if (clipText && clipText.trim().length > 0 && clipText.trim().length < 5000) {
        setText(clipText.trim());
      }
    });
  }, []);

  const handleTranslate = async (values: any) => {
    const inputText = values.text || text;
    const targetLang = values.to || to;

    if (!inputText.trim()) {
      showToast(Toast.Style.Failure, "No text provided");
      return;
    }
    
    setIsLoading(true);
    setResult("");
    
    try {
      const response = await axios.get("https://translate.googleapis.com/translate_a/single", {
        params: {
          client: "gtx",
          sl: "auto",
          tl: targetLang,
          dt: "t",
          q: inputText,
        },
      });

      if (response.data && response.data[0]) {
        const translatedText = response.data[0].map((item: any) => item[0]).join("");
        setResult(translatedText);
        showToast(Toast.Style.Success, "Translated!");
      } else {
        throw new Error("Invalid response from Google");
      }
    } catch (e: any) {
      showToast(Toast.Style.Failure, "Translation failed", e.message || "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Translate" icon={Icon.Globe} onSubmit={handleTranslate} />
          {result && (
            <Action.CopyToClipboard title="Copy Result" content={result} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          )}
          <Action
            title="Swap Languages (Toggle EN/DE)"
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() => setTo(to === "de" ? "en" : "de")}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Original Text"
        value={text}
        onChange={setText}
        placeholder="Paste text here or it auto-loads from clipboard..."
      />
      <Form.Dropdown id="to" title="Target Language" value={to} onChange={setTo}>
        <Form.Dropdown.Item value="de" title="German (Deutsch)" />
        <Form.Dropdown.Item value="en" title="English" />
        <Form.Dropdown.Item value="fr" title="French (Français)" />
        <Form.Dropdown.Item value="es" title="Spanish (Español)" />
        <Form.Dropdown.Item value="it" title="Italian (Italiano)" />
        <Form.Dropdown.Item value="ru" title="Russian (Русский)" />
        <Form.Dropdown.Item value="zh-CN" title="Chinese (Simplified)" />
        <Form.Dropdown.Item value="ja" title="Japanese (日本語)" />
      </Form.Dropdown>
      {result && (
        <Form.TextArea
          id="result"
          title="Translation"
          value={result}
          onChange={setResult}
        />
      )}
    </Form>
  );
}

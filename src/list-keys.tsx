import { LocalStorage, ActionPanel, List, Action, Icon, confirmAlert, showToast, Toast, Form, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { listKeys, GpgKey, deleteKey, setDefaultKey, addUid, setPrimaryUid } from "./gpg";
import { getCustomKeys, deleteCustomKey, CustomKey } from "./keychain";

export default function Command() {
  const [gpgKeys, setGpgKeys] = useState<GpgKey[]>([]);
  const [customKeys, setCustomKeys] = useState<CustomKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultKeys, setDefaultKeys] = useState<Record<string, string>>({});

  async function loadKeys() {
    setIsLoading(true);
    try {
      const pKeys = await listKeys(false);
      setGpgKeys(pKeys);
      
      const cKeys = await getCustomKeys();
      setCustomKeys(cKeys);
      
      const defs: Record<string, string> = {};
      defs["aes"] = await LocalStorage.getItem<string>("default_aes_key") || "";
      defs["kyber"] = await LocalStorage.getItem<string>("default_kyber_key") || "";
      defs["libsodium"] = await LocalStorage.getItem<string>("default_libsodium_key") || "";
      defs["age"] = await LocalStorage.getItem<string>("default_age_key") || "";
      setDefaultKeys(defs);

    } catch (e) {
      showToast({ title: "Failed to load keys", message: String(e), style: Toast.Style.Failure });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function handleDelete(key: GpgKey) {
    if (await confirmAlert({ title: "Delete Key?", message: `Are you sure you want to delete ${key.id}?` })) {
      try {
        await deleteKey(key.fingerprint);
        showToast({ title: "Key Deleted", style: Toast.Style.Success });
        loadKeys();
      } catch (e) {
        showToast({ title: "Failed to delete key", message: String(e), style: Toast.Style.Failure });
      }
    }
  }

  async function handleSetDefault(key: GpgKey) {
    try {
      await setDefaultKey(key.fingerprint);
      showToast({ title: "Default Key Set", style: Toast.Style.Success });
    } catch (e) {
      showToast({ title: "Failed to set default key", message: String(e), style: Toast.Style.Failure });
    }
  }

  async function handleCustomDelete(key: CustomKey) {
    if (await confirmAlert({ title: "Delete Key?", message: `Are you sure you want to delete ${key.name}?` })) {
      try {
        await deleteCustomKey(key.id);
        showToast({ title: "Key Deleted", style: Toast.Style.Success });
        loadKeys();
      } catch (e) {
        showToast({ title: "Failed to delete key", message: String(e), style: Toast.Style.Failure });
      }
    }
  }

  async function handleSetCustomDefault(key: CustomKey) {
    try {
      await LocalStorage.setItem(`default_${key.type}_key`, key.id);
      showToast({ title: "Default Key Set", message: `For engine: ${key.type.toUpperCase()}`, style: Toast.Style.Success });
      loadKeys();
    } catch (e) {
      showToast({ title: "Failed to set default", style: Toast.Style.Failure });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search keys...">
      <List.Section title="GPG Keys">
        {gpgKeys.map((k) => (
          <List.Item
            key={k.fingerprint}
            icon={Icon.Key}
            title={k.uids[0] || "Unknown"}
            subtitle={k.id}
            accessories={[{ text: k.type }]}
            actions={
              <ActionPanel>
                <Action.Push title="Manage UIDs" icon={Icon.Person} target={<ManageUidsView gpgKey={k} onUpdate={loadKeys} />} />
                <Action.CopyToClipboard title="Copy Fingerprint" content={k.fingerprint} />
                <Action.CopyToClipboard title="Copy Key ID" content={k.id} />
                <Action title="Set as Default Key" icon={Icon.Star} onAction={() => handleSetDefault(k)} />
                <Action.Push title="Add UID" icon={Icon.Plus} target={<AddUidForm gpgKey={k} onAdded={loadKeys} />} />
                <Action title="Delete Key" icon={Icon.Trash} onAction={() => handleDelete(k)} style={Action.Style.Destructive} />
                <Action title="Reload" icon={Icon.ArrowClockwise} onAction={loadKeys} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Custom Keys (AES, Libsodium, Kyber, Age)">
        {customKeys.map((k) => (
          <List.Item
            key={k.id}
            icon={Icon.Lock}
            title={k.name}
            accessories={[
              { text: k.type.toUpperCase() },
              defaultKeys[k.type] === k.id ? { icon: Icon.Star, tooltip: "Default Key" } : {}
            ]}
            actions={
              <ActionPanel>
                <Action title="Set as Default Key" icon={Icon.Star} onAction={() => handleSetCustomDefault(k)} />
               
                <Action title="Delete Key" icon={Icon.Trash} onAction={() => handleCustomDelete(k)} style={Action.Style.Destructive} />
                <Action title="Reload" icon={Icon.ArrowClockwise} onAction={loadKeys} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ManageUidsView({ gpgKey, onUpdate }: { gpgKey: GpgKey; onUpdate: () => void }) {
  const { pop } = useNavigation();

  async function handleMakePrimary(uid: string) {
    try {
      await setPrimaryUid(gpgKey.fingerprint, uid);
      showToast({ title: "Primary UID Set", style: Toast.Style.Success });
      onUpdate();
      pop();
    } catch (e) {
      showToast({ title: "Failed", message: String(e), style: Toast.Style.Failure });
    }
  }

  return (
    <List navigationTitle={`UIDs for ${gpgKey.id}`}>
      {gpgKey.uids.map((uid, index) => (
        <List.Item
          key={uid + index}
          title={uid}
          accessories={index === 0 ? [{ text: "Primary", icon: Icon.Star }] : []}
          actions={
            <ActionPanel>
              <Action title="Set as Primary UID" icon={Icon.StarCircle} onAction={() => handleMakePrimary(uid)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AddUidForm({ gpgKey, onAdded }: { gpgKey: GpgKey; onAdded: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; email: string }) {
    setIsLoading(true);
    try {
      await addUid(gpgKey.fingerprint, values.name, values.email);
      showToast({ title: "UID Added", style: Toast.Style.Success });
      onAdded();
      pop();
    } catch (e) {
      showToast({ title: "Failed to add UID", message: String(e), style: Toast.Style.Failure });
    }
    setIsLoading(false);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add UID" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Adding UID to ${gpgKey.id}`} />
      <Form.TextField id="name" title="Full Name" placeholder="John Doe" />
      <Form.TextField id="email" title="Email" placeholder="john@example.com" />
    </Form>
  );
}

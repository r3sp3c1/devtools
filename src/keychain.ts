// @ts-nocheck

import { LocalStorage } from "@raycast/api";
import crypto from "crypto";
import sodium from "libsodium-wrappers-sumo";
import * as kyber from "crystals-kyber";
import { encryptAes } from "./crypto";

export type CustomKey = {
  id: string;
  name: string;
  type: "aes" | "libsodium" | "kyber" | "age";
  privateKeyBase64: string; 
  publicKey?: string;       
  createdAt: number;
  level?: 512 | 768 | 1024;
};

export async function getCustomKeys(): Promise<CustomKey[]> {
  const keysStr = await LocalStorage.getItem<string>("custom_keys");
  if (!keysStr) return [];
  return JSON.parse(keysStr);
}

export async function saveCustomKey(key: CustomKey) {
  const keys = await getCustomKeys();
  keys.push(key);
  await LocalStorage.setItem("custom_keys", JSON.stringify(keys));
}

export async function generateAesKey(name: string, password?: string) {
  const secret = crypto.randomBytes(32).toString("base64");
  const key: CustomKey = {
    id: crypto.randomUUID(),
    name,
    type: "aes",
    privateKeyBase64: password ? await encryptAes(secret, password, undefined, "argon2") : secret,
    createdAt: Date.now(),
  };
  await saveCustomKey(key);
  return key;
}

export async function generateLibsodiumKey(name: string, password?: string) {
  await sodium.ready;
  const keypair = sodium.crypto_sign_keypair();
  const key: CustomKey = {
    id: crypto.randomUUID(),
    name,
    type: "libsodium",
    privateKeyBase64: password ? await encryptAes(Buffer.from(keypair.privateKey).toString("base64"), password, undefined, "argon2") : Buffer.from(keypair.privateKey).toString("base64"),
    publicKey: Buffer.from(keypair.publicKey).toString("base64"),
    createdAt: Date.now(),
  };
  await saveCustomKey(key);
  return key;
}

export async function generateKyberKey(name: string, level: 512 | 768 | 1024 = 768, password?: string) {
  let pk, sk;
  if (level === 512) [pk, sk] = kyber.KeyGen512();
  else if (level === 1024) [pk, sk] = kyber.KeyGen1024();
  else [pk, sk] = kyber.KeyGen768();

  const key: CustomKey = {
    id: crypto.randomUUID(),
    name: `${name} (${level})`,
    type: "kyber",
    level,
    privateKeyBase64: password ? await encryptAes(Buffer.from(sk).toString("base64"), password, undefined, "argon2") : Buffer.from(sk).toString("base64"),
    publicKey: Buffer.from(pk).toString("base64"),
    createdAt: Date.now(),
  };
  await saveCustomKey(key);
  return key;
}

export async function deleteCustomKey(id: string) {
  const keys = await getCustomKeys();
  const filtered = keys.filter(k => k.id !== id);
  await LocalStorage.setItem("custom_keys", JSON.stringify(filtered));
}

import { generateAgeKey as genAge, encryptAge } from "./age-crypto";
export async function generateAgeCustomKey(name: string, password?: string) {
  const { publicKey, privateKey } = await genAge(name);
  // for age, we store privateKey in base64. If password is provided, we AES encrypt it.
  const pkb64 = Buffer.from(privateKey).toString("base64");
  const key: CustomKey = {
    id: crypto.randomUUID(),
    name,
    type: "age",
    privateKeyBase64: password ? await encryptAes(pkb64, password, undefined, "argon2") : pkb64,
    publicKey: publicKey,
    createdAt: Date.now(),
  };
  await saveCustomKey(key);
  return key;
}

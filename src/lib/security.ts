function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

export async function hashPin(pin: string): Promise<string> {
  const saltBytes = new Uint8Array(12);
  crypto.getRandomValues(saltBytes);
  const salt = toHex(saltBytes);
  const digest = await sha256(`${salt}:${pin}`);
  return `${salt}$${digest}`;
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 2) return false;
  const [salt, expected] = parts;
  const actual = await sha256(`${salt}:${pin}`);
  return actual === expected;
}

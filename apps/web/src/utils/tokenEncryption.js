const crypto = require("node:crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const encryptionKey =
    process.env.OAUTH_ENCRYPTION_KEY;

  if (
    !encryptionKey ||
    !/^[a-fA-F0-9]{64}$/.test(encryptionKey)
  ) {
    throw new Error(
      "OAUTH_ENCRYPTION_KEY debe contener 64 caracteres hexadecimales",
    );
  }

  return Buffer.from(encryptionKey, "hex");
}

function encryptToken(token) {
  if (!token) {
    return null;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    key,
    iv,
    {
      authTagLength: AUTH_TAG_LENGTH,
    },
  );

  const encryptedToken = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encryptedToken.toString("base64"),
  ].join(".");
}

function decryptToken(encryptedValue) {
  if (!encryptedValue) {
    return null;
  }

  const parts = encryptedValue.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "El formato del token cifrado no es válido",
    );
  }

  const [ivValue, authTagValue, tokenValue] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivValue, "base64");
  const authTag = Buffer.from(
    authTagValue,
    "base64",
  );
  const encryptedToken = Buffer.from(
    tokenValue,
    "base64",
  );

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    iv,
    {
      authTagLength: AUTH_TAG_LENGTH,
    },
  );

  decipher.setAuthTag(authTag);

  const decryptedToken = Buffer.concat([
    decipher.update(encryptedToken),
    decipher.final(),
  ]);

  return decryptedToken.toString("utf8");
}

module.exports = {
  encryptToken,
  decryptToken,
};
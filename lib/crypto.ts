import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const hex = process.env.TENANT_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[crypto] TENANT_ENCRYPTION_KEY deve ser um hex de 64 caracteres em producao')
    }
    console.warn('[crypto] TENANT_ENCRYPTION_KEY nao configurada, usando chave dev-only')
    return Buffer.from('0'.repeat(64), 'hex')
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Encripta uma string (dbUrl) com AES-256-GCM.
 * Retorna base64 contendo: IV (12 bytes) + authTag (16 bytes) + ciphertext
 */
export function encryptDbUrl(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decripta uma string encriptada com encryptDbUrl.
 */
export function decryptDbUrl(encrypted: string): string {
  const key = getKey()
  const combined = Buffer.from(encrypted, 'base64')

  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

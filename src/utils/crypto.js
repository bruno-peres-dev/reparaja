const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-32-chars-long-123';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Criptografa dados sensíveis
 * @param {string} text - Texto a ser criptografado
 * @returns {string} - Dados criptografados em base64
 */
function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  // Deriva a chave usando PBKDF2
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
  
  const cipher = crypto.createCipher(ALGORITHM, key);
  cipher.setAAD(salt);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combina IV + Salt + Tag + Dados criptografados
  const result = Buffer.concat([iv, salt, tag, Buffer.from(encrypted, 'hex')]);
  
  return result.toString('base64');
}

/**
 * Descriptografa dados
 * @param {string} encryptedData - Dados criptografados em base64
 * @returns {string} - Texto descriptografado
 */
function decrypt(encryptedData) {
  if (!encryptedData) return null;
  
  try {
    const buffer = Buffer.from(encryptedData, 'base64');
    
    const iv = buffer.slice(0, IV_LENGTH);
    const salt = buffer.slice(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
    const tag = buffer.slice(IV_LENGTH + SALT_LENGTH, IV_LENGTH + SALT_LENGTH + TAG_LENGTH);
    const encrypted = buffer.slice(IV_LENGTH + SALT_LENGTH + TAG_LENGTH);
    
    // Deriva a chave usando PBKDF2
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
    
    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAuthTag(tag);
    decipher.setAAD(salt);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar dados:', error);
    return null;
  }
}

/**
 * Gera hash HMAC para webhooks
 * @param {string} data - Dados para gerar o hash
 * @param {string} secret - Chave secreta
 * @returns {string} - Hash HMAC em hex
 */
function generateHmac(data, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Verifica assinatura HMAC de webhook
 * @param {string} data - Dados recebidos
 * @param {string} signature - Assinatura recebida
 * @param {string} secret - Chave secreta
 * @returns {boolean} - True se a assinatura for válida
 */
function verifyHmac(data, signature, secret) {
  const expectedSignature = `sha256=${generateHmac(data, secret)}`;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Gera código de 16 caracteres (Base32 Crockford)
 * @param {string} seed - Semente para geração
 * @returns {string} - Código no formato XXXX-XXXX-XXXX-XXXX
 */
function generateCode16(seed) {
  // Base32 Crockford sem I/O/L/U
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  
  // Gera hash do seed
  const hash = crypto.createHash('sha256').update(seed).digest();
  
  // Converte para Base32
  let result = '';
  for (let i = 0; i < 16; i++) {
    const byte = hash[i];
    result += alphabet[byte % 32];
  }
  
  // Formata com hífens
  return `${result.slice(0, 4)}-${result.slice(4, 8)}-${result.slice(8, 12)}-${result.slice(12, 16)}`;
}

/**
 * Valida formato do código de 16 caracteres
 * @param {string} code - Código a ser validado
 * @returns {boolean} - True se o formato for válido
 */
function validateCode16(code) {
  const pattern = /^[0-9A-HJ-NP-TV-Z]{4}-[0-9A-HJ-NP-TV-Z]{4}-[0-9A-HJ-NP-TV-Z]{4}-[0-9A-HJ-NP-TV-Z]{4}$/;
  return pattern.test(code);
}

/**
 * Gera UUID v4
 * @returns {string} - UUID v4
 */
function generateUUID() {
  return crypto.randomUUID();
}

module.exports = {
  encrypt,
  decrypt,
  generateHmac,
  verifyHmac,
  generateCode16,
  validateCode16,
  generateUUID
};

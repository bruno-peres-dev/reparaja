const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { generateUUID } = require('../utils/crypto');
const Media = require('../models/Media');
const logger = require('../utils/logger').safeLogger;

class MediaService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
    this.allowedTypes = {
      image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
    };
  }

  // Configuração do Multer
  getUploadMiddleware() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const tenantDir = path.join(this.uploadDir, req.tenant_id);
        const typeDir = path.join(tenantDir, this.getFileType(file.mimetype));
        
        try {
          await fs.mkdir(typeDir, { recursive: true });
          cb(null, typeDir);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueName = `${generateUUID()}_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedMimes = Object.values(this.allowedTypes).flat();
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: 10 // Máximo 10 arquivos por upload
      }
    });
  }

  // Processar upload de arquivo
  async processUpload(file, metadata, tenant_id, vehicle_id, order_id, uploaded_by) {
    try {
      const fileType = this.getFileType(file.mimetype);
      const filePath = file.path;
      
      let thumbnailUrl = null;
      let processedUrl = file.path;

      // Processar imagem se for do tipo imagem
      if (fileType === 'image') {
        const processed = await this.processImage(filePath);
        processedUrl = processed.path;
        
        // Gerar thumbnail
        const thumbnail = await this.generateThumbnail(filePath);
        thumbnailUrl = thumbnail.path;
      }

      // Salvar no banco
      const mediaData = {
        tenant_id,
        vehicle_id,
        order_id,
        type: fileType,
        filename: path.basename(processedUrl),
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        url: processedUrl,
        thumbnail_url: thumbnailUrl,
        metadata: {
          ...metadata,
          original_path: file.path,
          dimensions: file.dimensions || null
        },
        uploaded_by
      };

      const media = await Media.create(mediaData);
      
      logger.info('Arquivo processado com sucesso', {
        media_id: media.id,
        filename: file.originalname,
        type: fileType,
        size: file.size
      });

      return media;

    } catch (error) {
      logger.error('Erro ao processar upload', { error: error.message });
      throw error;
    }
  }

  // Processar imagem
  async processImage(filePath) {
    try {
      const outputPath = filePath.replace(/\.[^/.]+$/, '_processed.jpg');
      
      await sharp(filePath)
        .resize(1920, 1080, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85, progressive: true })
        .toFile(outputPath);

      return { path: outputPath };
    } catch (error) {
      logger.error('Erro ao processar imagem', { error: error.message });
      return { path: filePath }; // Retorna original se falhar
    }
  }

  // Gerar thumbnail
  async generateThumbnail(filePath) {
    try {
      const thumbnailPath = filePath.replace(/\.[^/.]+$/, '_thumb.jpg');
      
      await sharp(filePath)
        .resize(300, 300, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return { path: thumbnailPath };
    } catch (error) {
      logger.error('Erro ao gerar thumbnail', { error: error.message });
      return { path: null };
    }
  }

  // Obter tipo de arquivo baseado no MIME type
  getFileType(mimeType) {
    for (const [type, mimes] of Object.entries(this.allowedTypes)) {
      if (mimes.includes(mimeType)) {
        return type;
      }
    }
    return 'document';
  }

  // Validar arquivo
  validateFile(file) {
    const errors = [];

    if (file.size > this.maxFileSize) {
      errors.push(`Arquivo muito grande. Máximo: ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    const allowedMimes = Object.values(this.allowedTypes).flat();
    if (!allowedMimes.includes(file.mimetype)) {
      errors.push(`Tipo de arquivo não permitido: ${file.mimetype}`);
    }

    return errors;
  }

  // Limpar arquivos temporários
  async cleanupTempFiles(files) {
    for (const file of files) {
      try {
        if (file.path && file.path !== file.processedPath) {
          await fs.unlink(file.path);
        }
      } catch (error) {
        logger.warn('Erro ao limpar arquivo temporário', { error: error.message });
      }
    }
  }

  // Obter estatísticas de armazenamento
  async getStorageStats(tenant_id) {
    return await Media.getStorageStats(tenant_id);
  }
}

module.exports = MediaService;
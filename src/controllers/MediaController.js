const Media = require('../models/Media');
const MediaService = require('../services/MediaService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger').safeLogger;

class MediaController {
  constructor() {
    this.mediaService = new MediaService();
  }

  // Upload de arquivos
  async upload(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'Dados inválidos',
          details: errors.array()
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'Nenhum arquivo enviado'
        });
      }

      const { vehicle_id, order_id, description, tags } = req.body;
      const tenant_id = req.tenant_id;
      const uploaded_by = req.user.id;

      const uploadedMedia = [];

      for (const file of req.files) {
        try {
          // Validar arquivo
          const validationErrors = this.mediaService.validateFile(file);
          if (validationErrors.length > 0) {
            logger.warn('Arquivo rejeitado', { 
              filename: file.originalname, 
              errors: validationErrors 
            });
            continue;
          }

          // Processar upload
          const metadata = {
            description: description || '',
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            upload_source: 'api',
            ip_address: req.ip
          };

          const media = await this.mediaService.processUpload(
            file, metadata, tenant_id, vehicle_id, order_id, uploaded_by
          );

          uploadedMedia.push(media);

        } catch (error) {
          logger.error('Erro no upload individual', { 
            filename: file.originalname, 
            error: error.message 
          });
        }
      }

      // Limpar arquivos temporários
      await this.mediaService.cleanupTempFiles(req.files);

      if (uploadedMedia.length === 0) {
        return res.status(400).json({
          error: 'upload_failed',
          message: 'Nenhum arquivo foi processado com sucesso'
        });
      }

      res.status(201).json({
        message: `${uploadedMedia.length} arquivo(s) enviado(s) com sucesso`,
        media: uploadedMedia,
        failed: req.files.length - uploadedMedia.length
      });

    } catch (error) {
      logger.error('Erro no upload', { error: error.message });
      res.status(500).json({
        error: 'internal_error',
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar mídia
  async list(req, res) {
    try {
      const { page = 1, limit = 50, vehicle_id, order_id, type, uploaded_by } = req.query;
      const tenant_id = req.tenant_id;

      const filters = {};
      if (vehicle_id) filters.vehicle_id = vehicle_id;
      if (order_id) filters.order_id = order_id;
      if (type) filters.type = type;
      if (uploaded_by) filters.uploaded_by = uploaded_by;

      const pagination = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        offset: (parseInt(page) - 1) * Math.min(parseInt(limit), 100)
      };

      const result = await Media.list(tenant_id, filters, pagination);

      // Headers de paginação
      res.set({
        'X-Total-Count': result.pagination.total,
        'X-Page': result.pagination.page,
        'X-Limit': result.pagination.limit,
        'X-Total-Pages': result.pagination.pages
      });

      res.json({
        media: result.media,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar mídia', { error: error.message });
      res.status(500).json({
        error: 'internal_error',
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter mídia por ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.tenant_id;

      const media = await Media.findById(id, tenant_id);
      if (!media) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Mídia não encontrada'
        });
      }

      res.json(media);

    } catch (error) {
      logger.error('Erro ao obter mídia', { error: error.message });
      res.status(500).json({
        error: 'internal_error',
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter mídia por veículo
  async getByVehicle(req, res) {
    try {
      const { vehicle_id } = req.params;
      const { type, order_id, limit } = req.query;
      const tenant_id = req.tenant_id;

      const filters = {};
      if (type) filters.type = type;
      if (order_id) filters.order_id = order_id;
      if (limit) filters.limit = parseInt(limit);

      const media = await Media.findByVehicle(vehicle_id, tenant_id, filters);

      res.json({
        vehicle_id,
        media,
        count: media.length
      });

    } catch (error) {
      logger.error('Erro ao obter mídia do veículo', { error: error.message });
      res.status(500).json({
        error: 'internal_error',
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar mídia
  async update(req, res) {
    try {
      const { id } = req.params;
      const { type, metadata, order_id } = req.body;
      const tenant_id = req.tenant_id;

      const updateData = {};
      if (type) updateData.type = type;
      if (metadata) updateData.metadata = metadata;
      if (order_id) updateData.order_id = order_id;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'Nenhum campo para atualizar'
        });
      }

      const media = await Media.update(id, tenant_id, updateData);
      if (!media) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Mídia não encontrada'
        });
      }

      res.json(media);

    } catch (error) {
      logger.error('Erro ao atualizar mídia', { error: error.message });
      res.status(500).json({
        error: 'internal_error',
        message: 'Erro interno do servidor'
      });
    }
  }

  // Deletar mídia
  async delete(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.tenant_id;

      const media = await Media.delete(id, tenant_id);
      if (!media) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Mídia não encontrada'
        });
      }

      res.json({
        message: 'Mídia deletada com sucesso',
        deleted_media: media
      });

    } catch (error) {
      logger.error('Erro ao deletar mídia', { error: error.message });
      res.status(500).json({
        error: 'internal_error',
        message: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas de armazenamento
  async getStorageStats(req, res) {
    try {
      const tenant_id = req.tenant_id;
      const stats = await this.mediaService.getStorageStats(tenant_id);

      res.json({
        tenant_id,
        stats,
        total_files: stats.reduce((sum, stat) => sum + parseInt(stat.total_files), 0),
        total_size: stats.reduce((sum, stat) => sum + parseInt(stat.total_size || 0), 0)
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas', { error: error.message });
      res.status(500).json({
        error: 'internal_error',
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = MediaController;
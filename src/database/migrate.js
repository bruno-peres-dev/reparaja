const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const logger = require('../utils/logger');

class DatabaseMigrator {
  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
    this.migrationsTable = 'schema_migrations';
  }

  /**
   * Inicializa a tabela de migrações
   */
  async initMigrationsTable() {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      logger.info('Tabela de migrações inicializada');
    } catch (error) {
      logger.error('Erro ao inicializar tabela de migrações', { error: error.message });
      throw error;
    }
  }

  /**
   * Lista todas as migrações disponíveis
   */
  getAvailableMigrations() {
    try {
      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      return files.map(file => {
        const version = file.split('_')[0];
        const name = file.replace('.sql', '').replace(`${version}_`, '');
        return { file, version, name };
      });
    } catch (error) {
      logger.error('Erro ao listar migrações', { error: error.message });
      throw error;
    }
  }

  /**
   * Lista migrações já executadas
   */
  async getExecutedMigrations() {
    try {
      const result = await query(`SELECT version FROM ${this.migrationsTable} ORDER BY version`);
      return result.rows.map(row => row.version);
    } catch (error) {
      logger.error('Erro ao buscar migrações executadas', { error: error.message });
      throw error;
    }
  }

  /**
   * Executa uma migração
   */
  async executeMigration(migration) {
    try {
      const filePath = path.join(this.migrationsPath, migration.file);
      const sql = fs.readFileSync(filePath, 'utf8');

      logger.info(`Executando migração: ${migration.version} - ${migration.name}`);

      // Executa a migração
      await query(sql);

      // Registra a migração como executada
      await query(
        `INSERT INTO ${this.migrationsTable} (version, name) VALUES ($1, $2)`,
        [migration.version, migration.name]
      );

      logger.info(`Migração executada com sucesso: ${migration.version}`);
    } catch (error) {
      logger.error(`Erro ao executar migração ${migration.version}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Executa todas as migrações pendentes
   */
  async migrate() {
    try {
      logger.info('Iniciando migração do banco de dados...');

      // Inicializa tabela de migrações
      await this.initMigrationsTable();

      // Busca migrações disponíveis e executadas
      const availableMigrations = this.getAvailableMigrations();
      const executedMigrations = await this.getExecutedMigrations();

      // Filtra migrações pendentes
      const pendingMigrations = availableMigrations.filter(
        migration => !executedMigrations.includes(migration.version)
      );

      if (pendingMigrations.length === 0) {
        logger.info('Nenhuma migração pendente');
        return;
      }

      logger.info(`${pendingMigrations.length} migração(ões) pendente(s)`);

      // Executa migrações pendentes
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      logger.info('Migração concluída com sucesso');
    } catch (error) {
      logger.error('Erro durante migração', { error: error.message });
      throw error;
    }
  }

  /**
   * Reverte última migração
   */
  async rollback() {
    try {
      logger.info('Iniciando rollback...');

      const result = await query(
        `SELECT version, name FROM ${this.migrationsTable} ORDER BY executed_at DESC LIMIT 1`
      );

      if (result.rows.length === 0) {
        logger.info('Nenhuma migração para reverter');
        return;
      }

      const lastMigration = result.rows[0];
      logger.info(`Revertendo migração: ${lastMigration.version} - ${lastMigration.name}`);

      // Remove registro da migração
      await query(
        `DELETE FROM ${this.migrationsTable} WHERE version = $1`,
        [lastMigration.version]
      );

      logger.info('Rollback concluído');
    } catch (error) {
      logger.error('Erro durante rollback', { error: error.message });
      throw error;
    }
  }

  /**
   * Mostra status das migrações
   */
  async status() {
    try {
      const availableMigrations = this.getAvailableMigrations();
      const executedMigrations = await this.getExecutedMigrations();

      console.log('\nStatus das Migrações:');
      console.log('====================\n');

      for (const migration of availableMigrations) {
        const status = executedMigrations.includes(migration.version) ? '✓' : '✗';
        console.log(`${status} ${migration.version} - ${migration.name}`);
      }

      const pendingCount = availableMigrations.length - executedMigrations.length;
      console.log(`\nTotal: ${availableMigrations.length} migrações, ${pendingCount} pendente(s)`);
    } catch (error) {
      logger.error('Erro ao mostrar status', { error: error.message });
      throw error;
    }
  }
}

// Execução do script
async function main() {
  const migrator = new DatabaseMigrator();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'migrate':
        await migrator.migrate();
        break;
      case 'rollback':
        await migrator.rollback();
        break;
      case 'status':
        await migrator.status();
        break;
      default:
        console.log('Uso: node migrate.js [migrate|rollback|status]');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Erro fatal', { error: error.message });
    process.exit(1);
  }
}

// Executa apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = DatabaseMigrator;

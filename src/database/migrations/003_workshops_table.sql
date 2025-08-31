-- Migration: 003_workshops_table.sql
-- Descrição: Cria tabela de workshops/oficinas
-- Data: 2024-12-15

-- Criar tabela de workshops
CREATE TABLE IF NOT EXISTS workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE,
  corporate_name VARCHAR(255),
  address JSONB DEFAULT '{}',
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  type VARCHAR(20) DEFAULT 'main' CHECK (type IN ('main', 'branch', 'partner')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  working_hours JSONB DEFAULT '{}',
  max_vehicles_per_day INTEGER DEFAULT 50 CHECK (max_vehicles_per_day > 0),
  max_mechanics INTEGER DEFAULT 10 CHECK (max_mechanics > 0),
  specialties TEXT[] DEFAULT '{}',
  erp_id VARCHAR(100),
  erp_sync_enabled BOOLEAN DEFAULT false,
  last_erp_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_workshops_tenant_id ON workshops(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workshops_status ON workshops(status);
CREATE INDEX IF NOT EXISTS idx_workshops_type ON workshops(type);
CREATE INDEX IF NOT EXISTS idx_workshops_cnpj ON workshops(cnpj);
CREATE INDEX IF NOT EXISTS idx_workshops_erp_id ON workshops(erp_id);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_workshops_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workshops_updated_at
  BEFORE UPDATE ON workshops
  FOR EACH ROW
  EXECUTE FUNCTION update_workshops_updated_at();

-- Adicionar coluna workshop_id nas tabelas existentes
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES workshops(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES workshops(id);

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_vehicles_workshop_id ON vehicles(workshop_id);
CREATE INDEX IF NOT EXISTS idx_orders_workshop_id ON orders(workshop_id);

-- Inserir oficina padrão para tenants existentes
INSERT INTO workshops (tenant_id, name, type, status, specialties)
SELECT 
  t.id,
  t.name || ' - Oficina Principal',
  'main',
  'active',
  ARRAY['manutencao', 'reparo', 'diagnostico']
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM workshops w WHERE w.tenant_id = t.id
);

-- Atualizar veículos existentes para usar a oficina padrão
UPDATE vehicles 
SET workshop_id = (
  SELECT w.id FROM workshops w 
  WHERE w.tenant_id = vehicles.tenant_id 
  AND w.type = 'main' 
  LIMIT 1
)
WHERE workshop_id IS NULL;

-- Atualizar ordens existentes para usar a oficina padrão
UPDATE orders 
SET workshop_id = (
  SELECT w.id FROM workshops w 
  WHERE w.tenant_id = orders.tenant_id 
  AND w.type = 'main' 
  LIMIT 1
)
WHERE workshop_id IS NULL;

-- Comentários da tabela
COMMENT ON TABLE workshops IS 'Tabela de workshops/oficinas do sistema';
COMMENT ON COLUMN workshops.id IS 'ID único da oficina';
COMMENT ON COLUMN workshops.tenant_id IS 'ID do tenant proprietário';
COMMENT ON COLUMN workshops.name IS 'Nome da oficina';
COMMENT ON COLUMN workshops.cnpj IS 'CNPJ da oficina';
COMMENT ON COLUMN workshops.corporate_name IS 'Razão social da oficina';
COMMENT ON COLUMN workshops.address IS 'Endereço completo da oficina (JSON)';
COMMENT ON COLUMN workshops.phone IS 'Telefone da oficina';
COMMENT ON COLUMN workshops.email IS 'Email da oficina';
COMMENT ON COLUMN workshops.website IS 'Website da oficina';
COMMENT ON COLUMN workshops.type IS 'Tipo da oficina: main, branch, partner';
COMMENT ON COLUMN workshops.status IS 'Status da oficina: active, inactive, suspended';
COMMENT ON COLUMN workshops.timezone IS 'Fuso horário da oficina';
COMMENT ON COLUMN workshops.working_hours IS 'Horário de funcionamento (JSON)';
COMMENT ON COLUMN workshops.max_vehicles_per_day IS 'Máximo de veículos atendidos por dia';
COMMENT ON COLUMN workshops.max_mechanics IS 'Máximo de mecânicos na oficina';
COMMENT ON COLUMN workshops.specialties IS 'Especialidades da oficina';
COMMENT ON COLUMN workshops.erp_id IS 'ID da oficina no sistema ERP';
COMMENT ON COLUMN workshops.erp_sync_enabled IS 'Sincronização com ERP habilitada';
COMMENT ON COLUMN workshops.last_erp_sync IS 'Última sincronização com ERP';
COMMENT ON COLUMN workshops.created_at IS 'Data de criação';
COMMENT ON COLUMN workshops.updated_at IS 'Data da última atualização';

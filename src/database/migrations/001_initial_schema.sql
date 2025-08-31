-- Migração inicial do banco de dados Repara-Já API
-- Versão: 001
-- Data: 2025-01-27

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de tenants (multi-tenancy)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'start' CHECK (plan IN ('start', 'pro', 'max', 'enterprise')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    limits JSONB NOT NULL DEFAULT '{"plates": 100, "messages": 1000}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tenants
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_plan ON tenants(plan);

-- Tabela de veículos
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plate VARCHAR(20) NOT NULL,
    code16 VARCHAR(19) NOT NULL UNIQUE, -- XXXX-XXXX-XXXX-XXXX
    owner JSONB NOT NULL DEFAULT '{}',
    meta JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para vehicles
CREATE INDEX idx_vehicles_tenant_id ON vehicles(tenant_id);
CREATE INDEX idx_vehicles_plate ON vehicles(plate);
CREATE INDEX idx_vehicles_code16 ON vehicles(code16);
CREATE INDEX idx_vehicles_created_at ON vehicles(created_at);

-- Constraint única para placa por tenant
CREATE UNIQUE INDEX idx_vehicles_tenant_plate ON vehicles(tenant_id, plate);

-- Tabela de ordens de serviço
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'awaiting_approval' CHECK (status IN ('awaiting_approval', 'approved', 'in_progress', 'completed', 'cancelled')),
    estimate_amount DECIMAL(10,2) NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para orders
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_vehicle_id ON orders(vehicle_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_approved ON orders(approved);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Tabela de mensagens
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
    state VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (state IN ('sent', 'delivered', 'read', 'failed', 'received')),
    payload JSONB NOT NULL,
    provider_id VARCHAR(255), -- ID da mensagem no WhatsApp
    metadata JSONB NOT NULL DEFAULT '{}',
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para messages
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_messages_direction ON messages(direction);
CREATE INDEX idx_messages_state ON messages(state);
CREATE INDEX idx_messages_provider_id ON messages(provider_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_tenant_created ON messages(tenant_id, created_at);

-- Tabela de templates
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'utility' CHECK (category IN ('utility', 'marketing', 'authentication')),
    language VARCHAR(10) NOT NULL DEFAULT 'pt_BR',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    body TEXT NOT NULL,
    header TEXT,
    footer TEXT,
    buttons JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para templates
CREATE INDEX idx_templates_name ON templates(name);
CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_language ON templates(language);

-- Tabela de webhooks de parceiros
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    events JSONB NOT NULL, -- Array de eventos
    secret VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para webhooks
CREATE INDEX idx_webhooks_active ON webhooks(active);
CREATE INDEX idx_webhooks_created_at ON webhooks(created_at);

-- Tabela de limites e quotas
CREATE TABLE quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period VARCHAR(7) NOT NULL, -- YYYY-MM
    resource_type VARCHAR(50) NOT NULL, -- 'plates', 'messages'
    used INTEGER NOT NULL DEFAULT 0,
    limit_value INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para quotas
CREATE INDEX idx_quotas_tenant_period ON quotas(tenant_id, period);
CREATE INDEX idx_quotas_resource_type ON quotas(resource_type);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotas_updated_at BEFORE UPDATE ON quotas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir tenant de exemplo
INSERT INTO tenants (id, name, plan, limits) VALUES (
    'tn_9f3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5',
    'Oficina do Bruno',
    'pro',
    '{"plates": 500, "messages": 10000}'
);

-- Comentários para documentação
COMMENT ON TABLE tenants IS 'Tabela de tenants (multi-tenancy)';
COMMENT ON TABLE vehicles IS 'Tabela de veículos cadastrados';
COMMENT ON TABLE orders IS 'Tabela de ordens de serviço';
COMMENT ON TABLE messages IS 'Tabela de mensagens enviadas/recebidas';
COMMENT ON TABLE templates IS 'Tabela de templates de mensagem';
COMMENT ON TABLE webhooks IS 'Tabela de webhooks de parceiros';
COMMENT ON TABLE quotas IS 'Tabela de quotas e limites por período';

-- Migration: 004_add_workshop_id_to_orders.sql
-- Descrição: Adiciona coluna workshop_id na tabela orders
-- Data: 2024-12-15

-- Adicionar coluna workshop_id na tabela orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES workshops(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_orders_workshop_id ON orders(workshop_id);

-- Atualizar ordens existentes para usar a oficina padrão
UPDATE orders 
SET workshop_id = (
  SELECT w.id FROM workshops w 
  WHERE w.tenant_id = orders.tenant_id 
  AND w.type = 'main' 
  LIMIT 1
)
WHERE workshop_id IS NULL;

-- Comentário da nova coluna
COMMENT ON COLUMN orders.workshop_id IS 'ID da oficina onde o serviço será realizado';

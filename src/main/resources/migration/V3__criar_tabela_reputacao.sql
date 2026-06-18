-- Criar a sequence que dita o id para a reputacao
CREATE SEQUENCE IF NOT EXISTS usuarios.reputacao_seq START WITH 1 INCREMENT BY 1;

-- Criar a tabela de reputacao no schema relacionando com tb_usuario
CREATE TABLE IF NOT EXISTS usuarios.tb_reputacao
(
    id                  BIGINT PRIMARY KEY,
    user_id             uuid UNIQUE NOT NULL,
    marks               INT           NOT NULL DEFAULT 3,
    nota           FLOAT         NOT NULL DEFAULT 5.0,
    data_ultima_punicao TIMESTAMP,
    suspenso_ate TIMESTAMP,

    CONSTRAINT fk_reputacao_usuario FOREIGN KEY (user_id)
        REFERENCES usuarios.tb_usuario (id) ON DELETE CASCADE,
    CONSTRAINT chk_pontos_nota CHECK (nota >= 0 AND nota <= 5.0),
    CONSTRAINT chk_marks_positivos CHECK (marks >= 0 AND marks <= 3)
);
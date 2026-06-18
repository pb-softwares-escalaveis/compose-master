-- Criar a sequence que dita o id para o endereco
CREATE SEQUENCE IF NOT EXISTS usuarios.endereco_seq START WITH 1 INCREMENT BY 1;

-- Criar a tabela de enderecos no schema relacionando com tb_usuario
CREATE TABLE IF NOT EXISTS usuarios.tb_endereco
(
    id          BIGINT PRIMARY KEY,
    user_id     uuid UNIQUE NOT NULL,
    pais        VARCHAR(100) NOT NULL,
    estado      VARCHAR(100) NOT NULL,
    cidade      VARCHAR(150) NOT NULL,
    bairro      VARCHAR(150) NOT NULL,
    rua         VARCHAR(255) NOT NULL,
    numero      VARCHAR(10),
    complemento VARCHAR(50),
    cep         VARCHAR(9)  NOT NULL,

    CONSTRAINT fk_endereco_usuario FOREIGN KEY (user_id)
        REFERENCES usuarios.tb_usuario (id) ON DELETE CASCADE
);
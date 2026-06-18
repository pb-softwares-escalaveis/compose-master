CREATE TABLE IF NOT EXISTS public.users_projection
(
    user_id        UUID PRIMARY KEY,
    correlation_id UUID                     NOT NULL,
    first_name     VARCHAR(255)             NOT NULL,
    last_name      VARCHAR(255)             NOT NULL,
    email          VARCHAR(255)             NOT NULL,
    cell_phone     VARCHAR(50)              NOT NULL,
    active         BOOLEAN                  NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL
);
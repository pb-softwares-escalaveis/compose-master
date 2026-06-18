CREATE TABLE IF NOT EXISTS public.payments
(
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id          UUID        NOT NULL,
    transaction_id          BIGINT      NOT NULL,
    auction_id              BIGINT      NOT NULL,
    bidder_id               UUID        NOT NULL,

    provider_payment_id     VARCHAR(255),
    status                  VARCHAR(50) NOT NULL,
    provider_payment_status VARCHAR(255),
    failure_reason          VARCHAR(255),

    amount_in_cents         INTEGER     NOT NULL,

    pix_copy_paste          TEXT,
    pix_qr_code             TEXT,

    paid_at                 TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL,
    expires_at              TIMESTAMPTZ,
    updated_at              TIMESTAMPTZ NOT NULL,

    CONSTRAINT uk_payments_transaction_id UNIQUE (transaction_id),
    CONSTRAINT uk_payments_provider_payment_id UNIQUE (provider_payment_id),

    CONSTRAINT ck_payments_amount_positive
        CHECK (amount_in_cents > 0),

    CONSTRAINT ck_payments_expiration_after_creation
        CHECK (
            expires_at IS NULL OR expires_at > created_at
            ),

    CONSTRAINT ck_payments_paid_after_creation
        CHECK (
            paid_at IS NULL OR paid_at >= created_at
            )
);

CREATE INDEX IF NOT EXISTS idx_payments_bidder_id
    ON public.payments (bidder_id);

CREATE INDEX IF NOT EXISTS idx_payments_auction_id
    ON public.payments (auction_id);

CREATE INDEX IF NOT EXISTS idx_payments_status_expires_at
    ON public.payments (status, expires_at);
CREATE SCHEMA IF NOT EXISTS report;

CREATE TABLE IF NOT EXISTS auction_report
(
    id              BIGSERIAL PRIMARY KEY,
    auction_id      BIGINT                   NOT NULL,
    seller_id       UUID                     NOT NULL,
    report_reason   VARCHAR(255)             NOT NULL,
    report_approved BOOLEAN                  NOT NULL,
    creation_date   TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS message_report
(
    id              BIGSERIAL PRIMARY KEY,
    message_id      BIGINT                   NOT NULL,
    user_id         UUID                     NOT NULL,
    report_reason   TEXT                     NOT NULL,
    report_approved BOOLEAN                  NOT NULL,
    creation_date   TIMESTAMP WITH TIME ZONE NOT NULL
);
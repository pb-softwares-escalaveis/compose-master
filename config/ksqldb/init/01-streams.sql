CREATE STREAM bids (
    correlationId VARCHAR,
    auctionId BIGINT,
    sellerId VARCHAR,
    highestBidderId VARCHAR,
    auctionTitle VARCHAR,
    auctionThumb VARCHAR,
    amount DECIMAL(10, 2),
    epochMilli BIGINT
)
WITH (
        KAFKA_TOPIC = 'auctions.bid.placed',
        VALUE_FORMAT = 'JSON',
        TIMESTAMP = 'epochMilli'
    );

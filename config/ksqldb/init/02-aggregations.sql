CREATE TABLE bid_notifications AS
SELECT auctionId, COLLECT_LIST (
        STRUCT (
            sellerId := sellerId,
            auctionTitle := auctionTitle,
            auctionThumb := auctionThumb,
            highestBidderId := highestBidderId,
            amount := amount,
            epochMilli := epochMilli / 1000
        )
    ) AS bids
FROM bids
WINDOW TUMBLING (SIZE 1 MINUTE)
GROUP BY
    auctionId EMIT FINAL;

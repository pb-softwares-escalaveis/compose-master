CREATE TABLE IF NOT EXISTS public.user_projections
(
    id
    uuid
    NOT
    NULL,
    email
    varchar
(
    255
) NULL,
    full_name varchar
(
    255
) NULL,
    profile_pic varchar
(
    255
) NULL,
    city varchar
(
    255
) NULL,
    state varchar
(
    255
) NULL,
    country varchar
(
    255
) NULL,
    score float4 NULL,
    created_at timestamptz
(
    6
) NULL,
    status varchar
(
    255
) NOT NULL,
    CONSTRAINT user_projections_status_check CHECK
(
    status
    IN
(
    'ACTIVE',
    'SUSPENDED',
    'BANNED',
    'DELETED'
)),
    CONSTRAINT user_projections_pkey PRIMARY KEY
(
    id
)
    );

CREATE TABLE IF NOT EXISTS public.auction_lots
(
    id
    int8
    GENERATED
    BY
    DEFAULT AS
    IDENTITY
    PRIMARY
    KEY,
    seller_id
    uuid
    NOT
    NULL,
    highest_bidder_id
    uuid
    NULL,
    title
    varchar
(
    100
) NOT NULL,
    description varchar
(
    1200
) NOT NULL,
    category varchar
(
    255
) NOT NULL,
    main_image_url varchar
(
    255
) NOT NULL,
    status varchar
(
    255
) NOT NULL,
    buy_now_price numeric
(
    38,
    2
) NULL,
    current_bid_price numeric
(
    38,
    2
) NOT NULL,
    initial_bid_price numeric
(
    38,
    2
) NOT NULL,
    duration_in_days int4 NOT NULL,
    created_at timestamptz
(
    6
) NOT NULL,
    updated_at timestamptz
(
    6
) NOT NULL,
    expiration_date timestamptz
(
    6
) NULL,
    CONSTRAINT check_buy_now_price_higher_than_initial_bid CHECK
(
    buy_now_price >
    initial_bid_price
),
    CONSTRAINT check_buy_now_price_positive CHECK
(
    buy_now_price >
    0
),
    CONSTRAINT check_initial_bid_price_positive CHECK
(
    initial_bid_price >
    0
),
    CONSTRAINT auction_lots_category_check CHECK
(
    category
    IN
(
    'ELECTRONICS',
    'VEHICLES',
    'FASHION',
    'COLLECTIBLES_AND_ART',
    'SPORTS',
    'HEALTH_AND_BEAUTY',
    'BOOKS',
    'MOVIE',
    'INDUSTRIAL',
    'JEWELRY',
    'PETS',
    'TOYS',
    'HOME_AND_GARDEN',
    'MUSIC',
    'OTHER'
)),
    CONSTRAINT auction_lots_status_check CHECK
(
    status
    IN
(
    'PENDING_REVIEW',
    'ACTIVE',
    'EXPIRED',
    'SOLD',
    'REMOVED',
    'CANCELED',
    'REJECTED'
))
    );

CREATE INDEX IF NOT EXISTS idx_auction_status_expiration ON public.auction_lots USING btree (status, expiration_date);

CREATE TABLE IF NOT EXISTS public.bids
(
    id
    int8
    GENERATED
    BY
    DEFAULT AS
    IDENTITY
    PRIMARY
    KEY,
    auction_lot_id
    int8
    NOT
    NULL,
    bidder_id
    uuid
    NOT
    NULL,
    amount
    numeric
(
    38,
    2
) NOT NULL,
    status varchar
(
    255
) NOT NULL,
    created_at timestamptz
(
    6
) NOT NULL,
    CONSTRAINT bids_status_check CHECK
(
    status
    IN
(
    'VALID',
    'INVALID'
)),
    CONSTRAINT fk_bids_auction_lot FOREIGN KEY
(
    auction_lot_id
) REFERENCES public.auction_lots
(
    id
)
    );

CREATE INDEX IF NOT EXISTS idx_highest_valid_bid ON public.bids USING btree (auction_lot_id, status, amount DESC);
export interface BinanceListing {
    currency?: {
        address?: string;
        name?: string;
        symbol?: string;
    };
    exchange?: {
        trading_pair_url?: string;
        name?: string;
    };
}

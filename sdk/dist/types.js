/**
 * A type guard function that determines if a transaction has a change output.
 */
export function isBitcoinTransactionWithChange(tx) {
    return 'changeIndex' in tx;
}

import { BatchDidUpdateParams, CommitRevealTransactions, DidUpdateParams } from '../types.js';
/**
 * Builds a bitcoin transaction that updates a DID. The transaction consumes the provided UTXO and
 * encodes the update operation into the witness of a reveal transaction.
 * @param didUpdateParams
 * @returns A bitcoin transaction that updates the did along with its txid.
 */
export declare function buildDidUpdateTransactions({ didSats, satsPerVByte, didUtxo, didPrivkey, didOutput, walletUtxos, network, changeAddress, update, did, }: DidUpdateParams): CommitRevealTransactions;
/**
 * Builds a pair of transactions to batch update multiple DIDs. The first transaction is a
 * commitment transaction that spends the provided UTXO, and the second transaction is a reveal
 * transaction that inscribes the update operations in the witness.
 * @param batchDidUpdateParams
 * @returns A pair of bitcoin transactions that batch update multiple DIDs along with their txids.
 */
export declare function buildBatchDidUpdateTransactions({ didSats, satsPerVByte, didUtxo, didPrivkey, didOutput, walletUtxos, network, changeAddress, updates, deactivationIndexes, }: BatchDidUpdateParams): CommitRevealTransactions;

import { Did } from '../types.js';
/**
 * Applies a DID update transaction to an existing DID object to produce the updated DID. This can
 * be used to derive the current state of a DID from its previous state and the most recent update
 * transaction, rather than resolving the DID "from scratch" using its creation transaction and
 * every update transaction since then.
 * @param did The previous state of the DID.
 * @param txHex The most recent update transaction in hex format.
 * @returns The current state of the DID.
 */
export declare function applyUpdateTransactionToDid(did: Did, txHex: string, didIndex?: number): Did;
/**
 * Resolves a DID from a series of bitcoin transactions.
 * @param transactions An array of bitcoin transactions in hex format and chronological order used to
 * resolve the DID. The first transaction must be the DID creation transaction and each subsequent
 * transaction must spend the DID UTXO from the previous transaction and update the DID.
 * @param didIndex The index of the did to resolve from the batch creation, if applicable.
 * @returns The current state of the DID resolved from the transactions.
 */
export declare function resolveDidBtc(transactions: string[], didIndex?: number): Did;

import { BatchDidCreationParams, BitcoinTransaction, CommitRevealTransactions, DidCreationParams } from '../types.js';
/**
 * Builds a bitcoin transaction that creates a DID. The transaction consumes the provided UTXO and
 * puts the provided multikey in an OP_RETURN output as the initial verification method.
 * @param didCreationParams
 * @returns A bitcoin transaction that creates a DID along with its txid.
 */
export declare function buildDidCreationTransaction({ multikey, walletUtxos, satsPerVByte, network, changeAddress, didOutput, didSats, verificationRelationshipFlags, }: DidCreationParams): BitcoinTransaction;
/**
 * Builds a pair of transactions to batch create multiple DIDs. The first transaction is a
 * commitment transaction that spends the provided UTXO, and the second transaction is a reveal
 * transaction that inscribes the public keys in the witness, with each key corresponding to
 * the initial verification method for a new DID.
 * @param batchDidCreationParams
 * @returns The raw bitcoin transactions for the commitment and reveal transactions along with
 * their corresponding txids.
 */
export declare function buildBatchDidCreationTransactions({ pubkeys, walletUtxos, satsPerVByte, network, changeAddress, didOutput, didSats, verificationRelationshipFlags, codec, }: BatchDidCreationParams): CommitRevealTransactions;

import { BitcoinTransaction, DidDeactivationParams } from '../types.js';
/**
 * Builds a bitcoin transaction that deactivates a DID. The transaction consumes the provided UTXO
 * and creates a OP_RETURN output that flags a DID as inactive.
 * @param didDeactivationParams
 * @returns
 */
export declare function buildDidDeactivationTransaction({ walletUtxos, didUtxo, didPrivkey, satsPerVByte, network, changeAddress, }: DidDeactivationParams): BitcoinTransaction;

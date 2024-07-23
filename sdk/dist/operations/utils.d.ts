/// <reference types="node" resolution-mode="require"/>
import { Transaction } from 'bitcoinjs-lib';
import { Tapleaf } from 'bitcoinjs-lib/src/types.js';
import { TaprootKey } from '../taprootKey.js';
import { CommitRevealTransactions, Network, Utxo, WalletUtxo } from '../types.js';
/**
 * A human-readable (in utf-8) prefix indicating that the payload of a witness reveal script
 * is the creation of a batch of DIDs.
 */
export declare const DIDS_BATCH_CREATION_PAYLOAD_PREFIX: Buffer;
/**
 * A human-readable (in utf-8) prefix indicating that an OP_RETURN output has a DID creation payload.
 */
export declare const DID_CREATION_OP_RETURN_PREFIX: Buffer;
export declare function getTapleafRevealScript(content: string | Buffer, tweakedPubkey: Buffer): Tapleaf;
export declare function parseRevealPayloadFromWitness(witness: Buffer[]): Buffer;
export declare function getInputHash(txid: string | Uint8Array | Buffer): Buffer;
export declare function addChangeIfEconomicallyFeasible(tx: Transaction, changeOutput: Buffer, inputValue: number, outputValue: number, fee: number, network: Network): {
    changeIndex: number | undefined;
    changeValue: number | undefined;
    changeAddress: string | undefined;
};
export declare function calculateTxFeeAndInputValue(utxos: Utxo[], outputs: {
    script: Buffer;
    value: number;
}[], changeOutput: Buffer, satsPerVByte: number): {
    fee: number;
    inputValue: number;
};
export declare function getTxFeeAssumingChangeOutput(calculationTx: Transaction, changeOutput: Buffer, satsPerVByte: number): number;
export declare function addAndSignInputsToTx(tx: Transaction, utxos: Utxo[], trKeys: TaprootKey[]): void;
export declare function getCommitRevealTransactions({ revealContent, walletUtxos, changeOutput, didSats, satsPerVByte, didOutput, network, }: {
    revealContent: Buffer;
    /** The list of utxos to consume, if a did UTXO is being spent it must be the first in the list. */
    walletUtxos: WalletUtxo[];
    changeOutput: Buffer;
    didSats: number;
    satsPerVByte: number;
    /**
     * The output script to control the new did UTXO. Defaults to a p2tr output using the first key
     * from the walletUtxos.
     */
    didOutput?: Buffer;
    network: Network;
}): CommitRevealTransactions;
export declare function getChangeOutput(changeAddress: string | undefined, privkey: Uint8Array, network: Network): Buffer;

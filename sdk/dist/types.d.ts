/// <reference types="node" resolution-mode="require"/>
import { VerificationRelationshipFlags } from './consts.js';
import { Codec } from './encoding.js';
/**
 * The data components encoded in a did:btc identifier.
 */
export type DidBtcIdentifier = {
    /** The block height in which the DID creation transaction was confirmed. */
    blockHeight: number;
    /** The index of the DID creation transaction in the block in which it was confirmed. */
    txIndex: number;
    /** If the DID was created in a batch, the index of the initial DID key in the batch. */
    didIndex?: number;
    /** The bitcoin network the DID was created on. */
    network?: Network;
};
export type Utxo = {
    txid: Buffer;
    index: number;
    value: number;
};
export type Network = 'mainnet' | 'testnet' | 'regtest';
/**
 * @see https://www.w3.org/TR/did-core/#verification-methods
 */
export type VerificationMethod = {
    /**
     * A multikey that specificies a public key for the verification method.
     * @see https://www.w3.org/TR/vc-data-integrity/#multikey
     */
    multikey: Buffer;
    /**  The verification relationships for this verification method. */
    verificationRelationshipFlags: VerificationRelationshipFlags;
};
export type Did = {
    /**
     * The verification methods for the DID.
     * @see https://www.w3.org/TR/did-core/#verification-methods
     */
    verificationMethods: VerificationMethod[];
    /** The p2tr key corresponding to the DID UTXO that can be used to update or deactivate the DID. */
    controllerKey?: Buffer;
    /** Additional metadata pertaining to the DID such as services. */
    metadata?: Record<string, object>;
    isDeactivated?: boolean;
};
/**
 * @see https://www.w3.org/TR/did-core/#verification-methods
 */
export type DidDocumentVerificationMethod = {
    id: string;
    controller: string;
    type: 'Multikey';
    publicKeyMultibase: string;
};
/**
 * @see https://www.w3.org/TR/did-core/#dfn-did-documents
 */
export type DidDocument = {
    '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/multikey/v1'
    ];
    id: string;
    controller: string;
    verificationMethod: DidDocumentVerificationMethod[];
    authentication?: string[];
    assertion?: string[];
    keyAgreement?: string[];
    capabilityInvocation?: string[];
    capabilityDelegation?: string[];
};
export type VerificationMethodDeletion = {
    i: number;
};
export type VerificationMethodUpdate = {
    i: number;
    k?: string;
    vr?: VerificationRelationshipFlags;
};
export type VerificationMethodAppend = {
    k: string;
    vr: VerificationRelationshipFlags;
};
export type VerificationMethodOperation = VerificationMethodDeletion | VerificationMethodUpdate | VerificationMethodAppend;
/**
 * @see https://microstrategy.github.io/did-btc-spec/#update
 */
export type DidUpdate = {
    /** Changes to the verification methods for the DID. */
    vm?: VerificationMethodOperation[];
    /** Metadata records to update in the DID document */
    u?: Record<string, object>;
    /** Metadata to delete from the DID document. */
    d?: Record<string, object>;
    /** Metadata to add to the DID document. */
    a?: Record<string, object>;
};
export type WalletUtxo = {
    /**
     * A reference to the unspent transaction output (UTXO) to be spent for this transaction. This
     * must be a pay-to-taproot (P2TR) output whose internal public key corresponds to the private key
     * provided.
     * @see https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#user-content-Taproot_key_path_spending_signature_validation
     */
    utxo: Utxo;
    /**
     * A 32 byte private key that corresponds to the internal public key of the UTXO being spent and
     * can therefore be used to produce a valid signature for the transaction.
     */
    privkey: Uint8Array;
};
export type BaseDidTransactionParams = {
    /**
     * The fee rate to be used for the transaction, expressed in satoshis per virtual byte (vByte).
     */
    satsPerVByte: number;
    /**
     * The number of satoshis to be committed to the DID output. This must be greater than the dust
     * limit of 330 satoshis. If not provided, a default value of 330 satoshis will be used. If this
     * value is zero, no did output will be created and the DID will not be able to be updated.
     */
    didSats?: number;
    /**
     * The output script to control the new did UTXO. Defaults to a p2tr output derived from the
     * private key used to sign the did input or the first wallet funding input if no did input is
     * being consumed.
     */
    didOutput?: Buffer;
    /**
     * The network to be used for the transaction. This defaults to 'mainnet' if not provided.
     */
    network: Network;
    /**
     * A custom change address to be used for the transaction. If not provided, the change will be
     * sent to a p2tr address derived from the private key used to sign the did input or the first
     * wallet funding input if no did input is being consumed.
     */
    changeAddress?: string;
    /** A list of utxos to consume for the transaction. */
    walletUtxos?: WalletUtxo[];
};
export type DidUtxo = {
    /**
     * A reference to the DID UTXO that was created in a previous transaction and controls the DID.
     * This must be a pay-to-taproot (P2TR) output whose internal public key corresponds to the private
     * key provided.
     */
    didUtxo: Utxo;
    /**
     * A 32 byte private key that corresponds to the internal public key of the DID UTXO being spent
     * and can therefore be used to produce a valid signature for the transaction.
     */
    didPrivkey: Uint8Array;
};
export type DidDeactivationParams = BaseDidTransactionParams & DidUtxo;
export type DidUpdateParams = BaseDidTransactionParams & DidUtxo & {
    /** The current state of the DID that is being updated. */
    did: Did;
    /** The update operation to apply to the DID. */
    update: DidUpdate;
};
export type BatchDidUpdate = {
    /** The current state of the DID that is being updated. */
    did: Did;
    /** The did index in its original batched creation transaction. */
    i: number;
    /**
     * The update operation to apply to the DID. If this is an empty object, the DID will be
     * deactivated.
     */
    update: DidUpdate;
};
export type BatchDidUpdateParams = BaseDidTransactionParams & DidUtxo & {
    /** A list of update operations to perform in batch. */
    updates?: BatchDidUpdate[];
    /** A list of indexes of DIDs to deactivate. */
    deactivationIndexes?: number[];
};
export type BaseDidCreationParams = BaseDidTransactionParams & {
    /**
     * The verification relationship flags to be used for the DID(s). If not provided, a default value
     * of 3 (AUTHENTICATION and ASSERTION) will be used.
     */
    verificationRelationshipFlags?: VerificationRelationshipFlags;
};
/**
 * The parameters required to create a single DID.
 */
export type DidCreationParams = {
    /**
     * The multikey to be used for the initial verification method for the DID. This is a byte array
     * that contains a public key as well as a multicodec prefix indicating the type of key.
     * @see https://www.w3.org/TR/vc-data-integrity/#multikey
     */
    multikey: Uint8Array;
} & BaseDidCreationParams;
/**
 * The parameters required to create multiple DIDs in batch using a two step process of a commitment
 * transaction and a reveal transaction with public key material in the witness.
 */
export type BatchDidCreationParams = {
    /**
     * The public keys to be used for the initial verification methods for the DIDs. These are byte
     * arrays that each contain a public key, all of the same length and key type.
     */
    pubkeys: Uint8Array[];
    /**
     * The codec indicating the key type of the provided public keys. This defaults to ed25519.
     */
    codec?: Codec;
} & BaseDidCreationParams;
/**
 * A bitcoin transaction that fully consumes the UTXO and does not create a change output.
 */
export type BitcoinTransactionNoChange = {
    /**
     * The serialized transaction in hexadecimal format.
     */
    txHex: string;
    /**
     * The hash of the transaction used to identify the transaction.
     * @see https://learnmeabitcoin.com/technical/transaction/input/txid/
     */
    txid: Buffer;
    /**
     * The index of the DID UTXO created in the transaction.
     */
    didUtxoIndex?: number;
    /**
     * The value of the DID UTXO created in the transaction.
     */
    didUtxoValue?: number;
};
/**
 * A bitcoin transaction that creates a change output.
 */
export type BitcoinTransactionWithChange = BitcoinTransactionNoChange & {
    /** The index of the change output in the transaction */
    changeIndex: number;
    /** The value of the change output in satoshis */
    changeValue: number;
    /** The address used for the change output */
    changeAddress: string;
};
/**
 * A bitcoin transaction.
 * @see https://developer.bitcoin.org/reference/transactions.html#raw-transaction-format
 */
export type BitcoinTransaction = BitcoinTransactionNoChange | BitcoinTransactionWithChange;
/**
 * A type guard function that determines if a transaction has a change output.
 */
export declare function isBitcoinTransactionWithChange(tx: BitcoinTransactionNoChange): tx is BitcoinTransactionWithChange;
export type CommitRevealTransactions = {
    commitTransaction: BitcoinTransaction;
    revealTransaction: BitcoinTransactionNoChange;
};

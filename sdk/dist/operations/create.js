import { payments, script, Transaction } from 'bitcoinjs-lib';
import assert from 'node:assert';
import { codecs } from '../encoding.js';
import { TaprootKey } from '../taprootKey.js';
import { defaultVerificationRelationshipFlags, DUST_LIMIT } from './consts.js';
import { addAndSignInputsToTx, addChangeIfEconomicallyFeasible, calculateTxFeeAndInputValue, DID_CREATION_OP_RETURN_PREFIX, DIDS_BATCH_CREATION_PAYLOAD_PREFIX, getChangeOutput, getCommitRevealTransactions, } from './utils.js';
/**
 * Builds a bitcoin transaction that creates a DID. The transaction consumes the provided UTXO and
 * puts the provided multikey in an OP_RETURN output as the initial verification method.
 * @param didCreationParams
 * @returns A bitcoin transaction that creates a DID along with its txid.
 */
export function buildDidCreationTransaction({ multikey, walletUtxos, satsPerVByte, network, changeAddress, didOutput, didSats = DUST_LIMIT, verificationRelationshipFlags = defaultVerificationRelationshipFlags, }) {
    assert(walletUtxos && walletUtxos.length > 0, 'walletUtxos must be provided');
    const utxos = walletUtxos.map(({ utxo }) => utxo);
    const trKeys = walletUtxos.map(({ privkey }) => new TaprootKey(privkey));
    didOutput =
        didOutput ??
            payments.p2tr({
                internalPubkey: trKeys[0].internalPubkey,
            }).output;
    assert(didSats >= DUST_LIMIT, 'didSats must be greater than 330 sat dust limit');
    assert(satsPerVByte >= 1, 'satsPerVByte must be greater than or equal to 1');
    const opReturnOutput = script.compile([
        script.OPS.OP_RETURN,
        Buffer.concat([
            DID_CREATION_OP_RETURN_PREFIX,
            Buffer.from([verificationRelationshipFlags]),
            multikey,
        ]),
    ]);
    const changeOutput = getChangeOutput(changeAddress, walletUtxos[0].privkey, network);
    const { fee, inputValue } = calculateTxFeeAndInputValue(utxos, [
        { script: opReturnOutput, value: 0 },
        { script: didOutput, value: didSats },
    ], changeOutput, satsPerVByte);
    const tx = new Transaction();
    tx.addOutput(opReturnOutput, 0);
    tx.addOutput(didOutput, didSats);
    const { changeIndex, changeValue } = addChangeIfEconomicallyFeasible(tx, changeOutput, inputValue, didSats, fee, network);
    addAndSignInputsToTx(tx, utxos, trKeys);
    return {
        txHex: tx.toHex(),
        txid: Buffer.from(tx.getId(), 'hex'),
        changeIndex,
        changeValue,
    };
}
function getBatchCreateContent(pubkeys, codec, verificationMethodFlags) {
    return Buffer.concat([
        // 7 byte prefix
        DIDS_BATCH_CREATION_PAYLOAD_PREFIX, // 4 bytes
        Buffer.from(codec), // 2 byte codec to indicate key type (and therefore key length)
        Buffer.from([verificationMethodFlags]), // 1 byte verification methods flags
        // payload of keys
        ...pubkeys,
    ]);
}
/**
 * Builds a pair of transactions to batch create multiple DIDs. The first transaction is a
 * commitment transaction that spends the provided UTXO, and the second transaction is a reveal
 * transaction that inscribes the public keys in the witness, with each key corresponding to
 * the initial verification method for a new DID.
 * @param batchDidCreationParams
 * @returns The raw bitcoin transactions for the commitment and reveal transactions along with
 * their corresponding txids.
 */
export function buildBatchDidCreationTransactions({ pubkeys, walletUtxos, satsPerVByte, network, changeAddress, didOutput, didSats = DUST_LIMIT, verificationRelationshipFlags = defaultVerificationRelationshipFlags, codec = codecs['ed25519-pub'], }) {
    assert(walletUtxos && walletUtxos.length > 0, 'walletUtxos must be provided');
    assert(didSats >= DUST_LIMIT, 'didSats must be greater than 330 sat dust limit');
    assert(satsPerVByte >= 1, 'satsPerVByte must be greater than or equal to 1');
    const expectedKeyLength = codec.pubkeyLength;
    assert(pubkeys.every((key) => key.length === expectedKeyLength), `all pubkeys must be ${expectedKeyLength} bytes`);
    const batchCreateContent = getBatchCreateContent(pubkeys, codec.prefix, verificationRelationshipFlags);
    const changeOutput = getChangeOutput(changeAddress, walletUtxos[0].privkey, network);
    return getCommitRevealTransactions({
        revealContent: batchCreateContent,
        walletUtxos,
        didSats,
        satsPerVByte,
        changeOutput,
        network,
        didOutput,
    });
}

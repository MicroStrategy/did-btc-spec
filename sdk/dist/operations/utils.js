import { Transaction, initEccLib, networks, payments, script, } from 'bitcoinjs-lib';
import { fromOutputScript, toOutputScript } from 'bitcoinjs-lib/src/address.js';
import { tapleafHash, tweakKey } from 'bitcoinjs-lib/src/payments/bip341.js';
import { OPS } from 'bitcoinjs-lib/src/script.js';
import assert from 'node:assert';
import * as tinysecp from 'tiny-secp256k1';
import { TaprootKey } from '../taprootKey.js';
import { DUST_LIMIT, STACK_ELEMENT_SIZE_LIMIT } from './consts.js';
initEccLib(tinysecp);
/**
 * A human-readable (in utf-8) prefix indicating that the payload of a witness reveal script
 * is the creation of a batch of DIDs.
 */
export const DIDS_BATCH_CREATION_PAYLOAD_PREFIX = Buffer.from('dids', 'utf-8');
/**
 * A human-readable (in utf-8) prefix indicating that an OP_RETURN output has a DID creation payload.
 */
export const DID_CREATION_OP_RETURN_PREFIX = Buffer.from('did', 'utf-8');
export function getTapleafRevealScript(content, tweakedPubkey) {
    const contentBytes = Buffer.isBuffer(content)
        ? content
        : Buffer.from(content, 'utf-8');
    const pushes = [];
    let offset = 0;
    while (offset < contentBytes.length) {
        pushes.push(contentBytes.subarray(offset, offset + STACK_ELEMENT_SIZE_LIMIT));
        offset += STACK_ELEMENT_SIZE_LIMIT;
    }
    return {
        output: script.compile([
            tweakedPubkey,
            script.OPS.OP_CHECKSIG,
            script.OPS.OP_FALSE,
            script.OPS.OP_IF,
            ...pushes,
            script.OPS.OP_ENDIF,
        ]),
    };
}
export function parseRevealPayloadFromWitness(witness) {
    const tapleafScript = witness[1];
    const inscription = tapleafScript.subarray(33 + 3, tapleafScript.length - 1);
    const pushes = [];
    let offset = 0;
    while (offset < inscription.length) {
        let pushSize;
        const pushOpCode = inscription[offset];
        if (pushOpCode >= 1 && pushOpCode <= 75) {
            pushSize = pushOpCode;
            offset += 1;
        }
        else if (pushOpCode === OPS.OP_PUSHDATA1) {
            pushSize = inscription.readUInt8(offset + 1);
            offset += 2;
        }
        else if (pushOpCode === OPS.OP_PUSHDATA2) {
            pushSize = inscription.readUInt16LE(offset + 1);
            offset += 3;
        }
        else {
            throw new Error(`Invalid push op code ${pushOpCode}`);
        }
        pushes.push(inscription.subarray(offset, offset + pushSize));
        offset += pushSize;
    }
    return Buffer.concat(pushes);
}
export function getInputHash(txid) {
    const bytes = typeof txid === 'string' ? Buffer.from(txid, 'hex') : Buffer.from(txid);
    return bytes.reverse();
}
export function addChangeIfEconomicallyFeasible(tx, changeOutput, inputValue, outputValue, fee, network) {
    const availableChange = inputValue - outputValue - fee;
    let changeValue;
    let changeIndex;
    let changeAddress;
    // if the change isn't economically feasible, just leave it for the fee
    if (availableChange > DUST_LIMIT) {
        changeValue = availableChange;
        changeIndex = tx.outs.length;
        const bitcoinNetwork = network === 'mainnet' ? networks.bitcoin : networks[network];
        changeAddress = fromOutputScript(changeOutput, bitcoinNetwork);
        tx.addOutput(changeOutput, changeValue);
    }
    if (availableChange < 0) {
        throw new Error('Insufficient funds for transaction fee');
    }
    return { changeIndex, changeValue, changeAddress };
}
export function calculateTxFeeAndInputValue(utxos, outputs, changeOutput, satsPerVByte) {
    const calculationTx = new Transaction();
    const inputValue = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    // add each utxo we will be consuming for the commit transaction
    for (let i = 0; i < utxos.length; i++) {
        calculationTx.addInput(getInputHash(utxos[i].txid), utxos[i].index);
        calculationTx.setWitness(i, [
            Buffer.allocUnsafe(64), // placeholder for signature
        ]);
    }
    outputs.forEach(({ script, value }) => {
        calculationTx.addOutput(script, value);
    });
    const outputValue = outputs.reduce((sum, { value }) => sum + value, 0);
    const txFeeAssumingChangeOutput = getTxFeeAssumingChangeOutput(calculationTx, changeOutput, satsPerVByte);
    addChangeIfEconomicallyFeasible(calculationTx, changeOutput, inputValue, outputValue, txFeeAssumingChangeOutput, 'mainnet');
    const txVBytes = calculationTx.virtualSize();
    const fee = Math.ceil(txVBytes * satsPerVByte);
    return { fee, inputValue };
}
export function getTxFeeAssumingChangeOutput(calculationTx, changeOutput, satsPerVByte) {
    // we want to add a change output only if it is economically feasible, which we determine by
    // calculating a fee that would pay for a transaction that includes the change output, which
    // adds the length of the output plus 9 bytes overhead
    return Math.ceil((calculationTx.virtualSize() + changeOutput.length + 9) * satsPerVByte);
}
export function addAndSignInputsToTx(tx, utxos, trKeys) {
    const prevoutScriptPubKeys = trKeys.map((trKey) => trKey.output);
    const prevoutValues = utxos.map((utxo) => utxo.value);
    for (let i = 0; i < utxos.length; i++) {
        tx.addInput(getInputHash(utxos[i].txid), utxos[i].index);
    }
    for (let i = 0; i < utxos.length; i++) {
        const sigHash = tx.hashForWitnessV1(i, prevoutScriptPubKeys, prevoutValues, Transaction.SIGHASH_DEFAULT);
        const commitSig = Buffer.from(tinysecp.signSchnorr(sigHash, trKeys[i].tweakedPrivkey));
        tx.setWitness(i, [commitSig]);
    }
}
export function getCommitRevealTransactions({ revealContent, walletUtxos, changeOutput, didSats, satsPerVByte, didOutput, network, }) {
    assert(walletUtxos.length > 0, 'At least one UTXO is required');
    const utxos = walletUtxos.map(({ utxo }) => utxo);
    const trKeys = walletUtxos.map(({ privkey }) => new TaprootKey(privkey));
    const tapLeaf = getTapleafRevealScript(revealContent, trKeys[0].tweakedPubkey);
    const tapHash = tapleafHash(tapLeaf);
    const commitP2tr = payments.p2tr({
        internalPubkey: trKeys[0].internalPubkey,
        scriptTree: tapLeaf,
    });
    const outputKey = tweakKey(trKeys[0].internalPubkey, tapHash);
    const controlBlock = Buffer.concat([
        Buffer.from([0xc0 | outputKey.parity]), // https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki#specification
        trKeys[0].internalPubkey,
    ]);
    const revealFeeCalculationTx = new Transaction();
    revealFeeCalculationTx.addInput(Buffer.allocUnsafe(32), // placeholder for commitment txid
    0);
    revealFeeCalculationTx.setWitness(0, [
        Buffer.allocUnsafe(64), // placeholder for signature
        tapLeaf.output,
        controlBlock,
    ]);
    revealFeeCalculationTx.addOutput(didOutput ?? trKeys[0].output, didSats);
    const revealVBytes = revealFeeCalculationTx.virtualSize();
    const revealFee = Math.ceil(revealVBytes * satsPerVByte);
    const commitUtxoValue = revealFee + didSats;
    // we have to calculate the fee for the commit tx before creating it
    const { fee: commitFee, inputValue } = calculateTxFeeAndInputValue(utxos, [{ script: commitP2tr.output, value: commitUtxoValue }], changeOutput, satsPerVByte);
    const commitTx = new Transaction();
    commitTx.addOutput(commitP2tr.output, commitUtxoValue);
    const { changeIndex, changeValue, changeAddress } = addChangeIfEconomicallyFeasible(commitTx, changeOutput, inputValue, commitUtxoValue, commitFee, network);
    addAndSignInputsToTx(commitTx, utxos, trKeys);
    const commitTransaction = {
        txHex: commitTx.toHex(),
        txid: Buffer.from(commitTx.getId(), 'hex'),
        changeValue,
        changeIndex,
        changeAddress,
    };
    const revealTx = new Transaction();
    revealTx.addInput(getInputHash(commitTransaction.txid), 0);
    revealTx.addOutput(didOutput ?? trKeys[0].output, didSats);
    const revealSigHash = revealTx.hashForWitnessV1(0, [commitP2tr.output], [commitUtxoValue], Transaction.SIGHASH_DEFAULT, tapHash);
    const sig = Buffer.from(tinysecp.signSchnorr(revealSigHash, trKeys[0].tweakedPrivkey));
    revealTx.setWitness(0, [sig, tapLeaf.output, controlBlock]);
    const revealTransaction = {
        txHex: revealTx.toHex(),
        txid: Buffer.from(revealTx.getId(), 'hex'),
        didUtxoIndex: 0,
        didUtxoValue: didSats,
    };
    return {
        commitTransaction,
        revealTransaction,
    };
}
export function getChangeOutput(changeAddress, privkey, network) {
    const bitcoinNetwork = network === 'mainnet' ? networks.bitcoin : networks[network];
    if (!changeAddress) {
        const trKey = new TaprootKey(privkey);
        return trKey.output;
    }
    else {
        try {
            return toOutputScript(changeAddress, bitcoinNetwork);
        }
        catch (e) {
            throw new Error(`Invalid change address ${changeAddress} for network ${network}`);
        }
    }
}

import { Transaction } from 'bitcoinjs-lib';
import assert from 'node:assert';
import { TaprootKey } from '../taprootKey.js';
import { DEACTIVATION_OP_RETURN_OUTPUT } from './consts.js';
import { addAndSignInputsToTx, addChangeIfEconomicallyFeasible, calculateTxFeeAndInputValue, getChangeOutput, } from './utils.js';
/**
 * Builds a bitcoin transaction that deactivates a DID. The transaction consumes the provided UTXO
 * and creates a OP_RETURN output that flags a DID as inactive.
 * @param didDeactivationParams
 * @returns
 */
export function buildDidDeactivationTransaction({ walletUtxos = [], didUtxo, didPrivkey, satsPerVByte, network, changeAddress, }) {
    const didWalletUtxo = { utxo: didUtxo, privkey: didPrivkey };
    const combinedWalletUtxos = [didWalletUtxo, ...walletUtxos];
    const utxos = combinedWalletUtxos.map(({ utxo }) => utxo);
    const trKeys = combinedWalletUtxos.map(({ privkey }) => new TaprootKey(privkey));
    assert(satsPerVByte >= 1, 'satsPerVByte must be greater than or equal to 1');
    const changeOutput = getChangeOutput(changeAddress, didPrivkey, network);
    const { fee, inputValue } = calculateTxFeeAndInputValue(utxos, [{ script: DEACTIVATION_OP_RETURN_OUTPUT, value: 0 }], changeOutput, satsPerVByte);
    const tx = new Transaction();
    tx.addOutput(DEACTIVATION_OP_RETURN_OUTPUT, 0);
    const { changeIndex, changeValue } = addChangeIfEconomicallyFeasible(tx, changeOutput, inputValue, 0, fee, network);
    addAndSignInputsToTx(tx, utxos, trKeys);
    return {
        txHex: tx.toHex(),
        txid: Buffer.from(tx.getId(), 'hex'),
        changeIndex,
        changeValue,
    };
}

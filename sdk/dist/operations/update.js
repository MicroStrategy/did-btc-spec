import assert from 'node:assert';
import { DUST_LIMIT } from './consts.js';
import { getChangeOutput, getCommitRevealTransactions } from './utils.js';
/**
 * Builds a bitcoin transaction that updates a DID. The transaction consumes the provided UTXO and
 * encodes the update operation into the witness of a reveal transaction.
 * @param didUpdateParams
 * @returns A bitcoin transaction that updates the did along with its txid.
 */
export function buildDidUpdateTransactions({ didSats = DUST_LIMIT, satsPerVByte, didUtxo, didPrivkey, didOutput, walletUtxos = [], network, changeAddress, update, did, }) {
    assert(didSats >= DUST_LIMIT, 'didSats must be greater than 330 sat dust limit');
    assert(satsPerVByte >= 1, 'satsPerVByte must be greater than or equal to 1');
    const updateContent = getUpdateContent(update, did);
    const didWalletUtxo = { utxo: didUtxo, privkey: didPrivkey };
    const changeOutput = getChangeOutput(changeAddress, didPrivkey, network);
    return getCommitRevealTransactions({
        revealContent: updateContent,
        walletUtxos: [didWalletUtxo, ...walletUtxos],
        didSats,
        satsPerVByte,
        changeOutput,
        network,
        didOutput,
    });
}
/**
 * Builds a pair of transactions to batch update multiple DIDs. The first transaction is a
 * commitment transaction that spends the provided UTXO, and the second transaction is a reveal
 * transaction that inscribes the update operations in the witness.
 * @param batchDidUpdateParams
 * @returns A pair of bitcoin transactions that batch update multiple DIDs along with their txids.
 */
export function buildBatchDidUpdateTransactions({ didSats = DUST_LIMIT, satsPerVByte, didUtxo, didPrivkey, didOutput, walletUtxos = [], network, changeAddress, updates, deactivationIndexes, }) {
    assert(didSats >= DUST_LIMIT, 'didSats must be greater than 330 sat dust limit');
    assert(satsPerVByte >= 1, 'satsPerVByte must be greater than or equal to 1');
    const batchUpdateContent = getBatchUpdateContent(updates, deactivationIndexes);
    const didWalletUtxo = { utxo: didUtxo, privkey: didPrivkey };
    const changeOutput = getChangeOutput(changeAddress, didPrivkey, network);
    return getCommitRevealTransactions({
        revealContent: batchUpdateContent,
        walletUtxos: [didWalletUtxo, ...walletUtxos],
        didSats,
        satsPerVByte,
        changeOutput,
        network,
        didOutput,
    });
}
function validateUpdateContent(update, did) {
    assert(!did.isDeactivated, 'Cannot update a deactivated DID');
    if (update.vm !== undefined) {
        update.vm.forEach((vm) => {
            if ('i' in vm) {
                assert(vm.i < did.verificationMethods.length, `Invalid verification method index ${vm.i}`);
            }
        });
    }
    if (update.d !== undefined) {
        Object.keys(update.d).forEach((key) => {
            assert(did.metadata && key in did.metadata, `Metadata key ${key} does not exist in DID document`);
        });
    }
    if (update.u !== undefined) {
        Object.keys(update.u).forEach((key) => {
            assert(did.metadata && key in did.metadata, `Metadata key ${key} does not exist in DID document`);
        });
    }
}
function getBatchUpdateContent(updates, deactivationIndexes) {
    const hasUpdates = updates !== undefined && updates.length > 0;
    const hasDeactivations = deactivationIndexes !== undefined && deactivationIndexes.length > 0;
    assert(hasUpdates || hasDeactivations, 'No updates or deactivations provided');
    const batchUpdates = updates?.map(({ i, update, did }) => {
        assert(i >= 0, 'i must be greater than or equal to 0');
        validateUpdateContent(update, did);
        return {
            ...update,
            i,
        };
    });
    const batchDeactivations = deactivationIndexes?.map((i) => {
        assert(i >= 0, 'i must be greater than or equal to 0');
        return {
            i,
        };
    });
    const batchUpdateContent = [
        ...(batchUpdates ?? []),
        ...(batchDeactivations ?? []),
    ];
    return Buffer.from(JSON.stringify(batchUpdateContent), 'utf8');
}
function getUpdateContent(update, did) {
    validateUpdateContent(update, did);
    return Buffer.from(JSON.stringify(update), 'utf8');
}

import { Transaction } from 'bitcoinjs-lib';
import assert from 'node:assert';
import { VerificationRelationshipFlags } from '../consts.js';
import { decodeMultibase } from '../encoding.js';
import {
  Did,
  DidUpdate,
  VerificationMethod,
  VerificationMethodOperation,
} from '../types.js';
import { DEACTIVATION_OP_RETURN_OUTPUT } from './consts.js';
import {
  isVerificationMethodAppend,
  isVerificationMethodDeletion,
  isVerificationMethodOperation,
  isVerificationMethodUpdate,
} from './types.js';
import {
  DID_CREATION_OP_RETURN_PREFIX,
  DIDS_BATCH_CREATION_PAYLOAD_PREFIX,
  parseRevealPayloadFromWitness,
} from './utils.js';

function getDidUpdateFromTransaction(
  updateTx: Transaction,
  didIndex?: number,
): DidUpdate | undefined {
  const payload = parseRevealPayloadFromWitness(updateTx.ins[0].witness);
  let payloadJson: unknown;
  try {
    payloadJson = JSON.parse(payload.toString('utf8'));
  } catch (err) {
    // this transaction does not have JSON in the witness, so ignore it
    return undefined;
  }

  if (Array.isArray(payloadJson)) {
    // batched update
    assert(didIndex !== undefined && didIndex >= 0);
    const didUpdate = payloadJson.find((didUpdate: unknown) => {
      assert(typeof didUpdate === 'object' && didUpdate !== null);
      assert(
        'i' in didUpdate && typeof didUpdate.i === 'number' && didUpdate.i >= 0,
      );
      return didUpdate.i === didIndex;
    });
    if (didUpdate === undefined) {
      return undefined;
    }
    assert(isDidUpdate(didUpdate));
    return didUpdate;
  } else {
    assert(
      didIndex === undefined,
      'didIndex must be undefined for single DID update',
    );
    assert(isDidUpdate(payloadJson));
    return payloadJson;
  }
}

function applyVerificationMethodOperationToDid(
  did: Did,
  vmOp: VerificationMethodOperation,
) {
  if (isVerificationMethodUpdate(vmOp)) {
    const { i, k, vr } = vmOp;
    if (k !== undefined) {
      did.verificationMethods[i].multikey = Buffer.from(decodeMultibase(k));
    }
    if (vr !== undefined) {
      did.verificationMethods[i].verificationRelationshipFlags = vr;
    }
  } else if (isVerificationMethodDeletion(vmOp)) {
    did.verificationMethods.splice(vmOp.i, 1);
  } else if (isVerificationMethodAppend(vmOp)) {
    did.verificationMethods.push({
      multikey: Buffer.from(decodeMultibase(vmOp.k)),
      verificationRelationshipFlags: vmOp.vr,
    });
  } else {
    throw new Error('Invalid verification method operation');
  }
}

/**
 * Applies a DID update transaction to an existing DID object to produce the updated DID. This can
 * be used to derive the current state of a DID from its previous state and the most recent update
 * transaction, rather than resolving the DID "from scratch" using its creation transaction and
 * every update transaction since then.
 * @param did The previous state of the DID.
 * @param txHex The most recent update transaction in hex format.
 * @returns The current state of the DID.
 */
export function applyUpdateTransactionToDid(
  did: Did,
  txHex: string,
  didIndex?: number,
): Did {
  const tx = Transaction.fromHex(txHex);
  if (tx.outs[0].script.equals(DEACTIVATION_OP_RETURN_OUTPUT)) {
    assert(
      didIndex === undefined,
      'didIndex must be undefined for single DID deactivation',
    );
    did.isDeactivated = true;
    return did;
  }

  const didUpdate = getDidUpdateFromTransaction(tx, didIndex);
  if (!didUpdate) {
    return did;
  }

  if (Object.keys(didUpdate).filter((key) => key !== 'i').length === 0) {
    // this DID is deactivated by the transaction
    did.isDeactivated = true;
    return did;
  }

  if (didUpdate.vm !== undefined) {
    didUpdate.vm.forEach((vmOp) => {
      applyVerificationMethodOperationToDid(did, vmOp);
    });
  }

  if (didUpdate.a !== undefined) {
    for (const [key, value] of Object.entries(didUpdate.a)) {
      if (did.metadata === undefined) {
        did.metadata = {};
      } else if (did.metadata[key] !== undefined) {
        throw new Error(`Metadata key ${key} already exists`);
      }
      did.metadata[key] = value;
    }
  }

  if (didUpdate.u !== undefined) {
    for (const [key, value] of Object.entries(didUpdate.u)) {
      if (did.metadata === undefined || did.metadata[key] === undefined) {
        throw new Error(`Metadata key ${key} does not exist`);
      }
      did.metadata[key] = value;
    }
  }

  if (didUpdate.d !== undefined) {
    for (const key of Object.keys(didUpdate.d)) {
      if (did.metadata === undefined || did.metadata[key] === undefined) {
        throw new Error(`Metadata key ${key} does not exist`);
      }
      delete did.metadata[key];
    }
  }

  return did;
}

/**
 * Resolves a DID from a series of bitcoin transactions.
 * @param transactions An array of bitcoin transactions in hex format and chronological order used to
 * resolve the DID. The first transaction must be the DID creation transaction and each subsequent
 * transaction must spend the DID UTXO from the previous transaction and update the DID.
 * @param didIndex The index of the did to resolve from the batch creation, if applicable.
 * @returns The current state of the DID resolved from the transactions.
 */
export function resolveDidBtc(transactions: string[], didIndex?: number): Did {
  assert(transactions.length >= 1, 'At least one transaction is required');
  const creationTxHex = transactions[0];

  const tx = Transaction.fromHex(creationTxHex);

  const verificationMethods: VerificationMethod[] = [];
  let controllerKey: Buffer | undefined;

  // if the first output is an OP_RETURN with the did prefix, the DID was created by itself
  if (tx.outs[0].script[0] === 0x6a) {
    const creationKeys = getKeysFromCreateTx(tx);
    const { subjectMultikey, verificationRelationshipFlags } = creationKeys;
    controllerKey = creationKeys.controllerKey;
    verificationMethods.push({
      multikey: subjectMultikey,
      verificationRelationshipFlags,
    });
  } else {
    // otherwise, the DID was created within a batch of DIDs in a single transaction
    assert(
      didIndex !== undefined,
      'didIndex is required for resolving a DID that was created in a batch',
    );
    assert(didIndex >= 0, 'didIndex must be greater than or equal to 0');

    controllerKey = tx.outs[0].script.subarray(2);

    const payload = parseRevealPayloadFromWitness(tx.ins[0].witness);

    const prefix = payload.subarray(0, 4);
    assert(
      prefix.equals(DIDS_BATCH_CREATION_PAYLOAD_PREFIX),
      'Invalid batch creation payload prefix',
    );
    const codec = payload.subarray(4, 6);
    const verificationRelationshipFlags =
      payload[6] as VerificationRelationshipFlags;
    assert(
      verificationRelationshipFlags < 32 && verificationRelationshipFlags > 0,
      'Invalid verification relationship flags',
    );

    // keys begin after first 7 bytes of payload
    const keyPos = 7 + didIndex * 32;
    const pubkey = payload.subarray(keyPos, keyPos + 32);
    const multikey = Buffer.concat([codec, pubkey]);

    verificationMethods.push({
      multikey,
      verificationRelationshipFlags,
    });
  }

  const did = {
    verificationMethods,
    controllerKey,
  };

  for (const txHex of transactions.slice(1)) {
    applyUpdateTransactionToDid(did, txHex, didIndex);
  }

  return did;
}

function getKeysFromCreateTx(tx: Transaction) {
  const opReturnOutput = tx.outs[0].script;
  // first 5 bytes of first output are OP_RETURN, OP_PUSH, 'd', 'i', 'd'
  const prefix = opReturnOutput.subarray(2, 5);
  assert(
    prefix.equals(DID_CREATION_OP_RETURN_PREFIX),
    'Invalid DID creation prefix',
  );
  // 6th byte is the verification relationship flags
  const verificationRelationshipFlags =
    opReturnOutput[5] as VerificationRelationshipFlags;
  assert(
    verificationRelationshipFlags < 32 && verificationRelationshipFlags > 0,
    'Invalid verification relationship flags',
  );
  // rest of output is the subject public key in multikey format
  const subjectMultikey = opReturnOutput.subarray(6);
  // first 2 bytes of second output are 1, OP_PUSH, remainder is the controller key
  const controllerKey = tx.outs[1] ? tx.outs[1].script.subarray(2) : undefined;

  return {
    subjectMultikey,
    verificationRelationshipFlags,
    controllerKey,
  };
}

function isDidUpdate(obj: unknown): obj is DidUpdate {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  if ('vm' in obj) {
    if (
      !Array.isArray(obj.vm) ||
      !obj.vm.every((vm: unknown) => isVerificationMethodOperation(vm))
    ) {
      return false;
    }
  }

  if ('u' in obj && typeof obj.u !== 'object') {
    return false;
  }
  if ('d' in obj && typeof obj.d !== 'object') {
    return false;
  }
  if ('a' in obj && typeof obj.a !== 'object') {
    return false;
  }

  return true;
}

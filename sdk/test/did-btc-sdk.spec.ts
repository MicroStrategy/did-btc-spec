import { Transaction, networks } from 'bitcoinjs-lib';
import { fromOutputScript } from 'bitcoinjs-lib/src/address';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  BatchDidUpdate,
  Did,
  Utxo,
  VerificationRelationshipFlags,
  WalletUtxo,
  buildBatchDidCreationTransactions,
  buildBatchDidUpdateTransactions,
  buildDidCreationTransaction,
  buildDidDeactivationTransaction,
  buildDidDocument,
  decodeDidBtc,
  encodeDidBtc,
  isBitcoinTransactionWithChange,
  resolveDidBtc,
} from '../src/index.js';
import {
  codecs,
  encodeMultibase,
  encodeMultikey,
  prependCodecToKey,
} from '../src/encoding.js';
import { defaultVerificationRelationshipFlags } from '../src/operations/consts.js';
import { TaprootKey } from '../src/taprootKey.js';

describe('did:btc SDK', () => {
  const blockHeight = 2819040;
  const txIndex = 1738;
  const didIndex = 3;
  const network = 'testnet';

  const pubkeysStr = [
    '988403912c92a9e10a384620a5eb6579da156b6d48fbe08dc5815d4abef38823',
    'b9b624758eea864d3268ac5d999e1b0ac3167313bc85ed1804b7d6713904a608',
    '548edbd592684fdf0a2a159d0f8845f22fdec8dc1f56d2209cb53acdb20f3d88',
  ];
  const pubkeys = pubkeysStr.map((pubkey) => Buffer.from(pubkey, 'hex'));

  describe('identifier encoding & decoding', () => {
    it('encodes a did', () => {
      const did = encodeDidBtc({
        blockHeight,
        txIndex,
        didIndex,
        network,
      });

      assert(did === 'did:btc:test:8q7p-v92k-prqq-7s2k-6a');
    });

    it('decodes a did', () => {
      const did = 'did:btc:test:8q7p-v92k-prqq-7s2k-6a';
      const didBtcIdentifier = decodeDidBtc(did);

      assert.strictEqual(didBtcIdentifier.blockHeight, blockHeight);
      assert.strictEqual(didBtcIdentifier.txIndex, txIndex);
      assert.strictEqual(didBtcIdentifier.didIndex, didIndex);
      assert.strictEqual(didBtcIdentifier.network, network);
    });
  });

  describe('creating did documents', () => {
    it('creates a did document', () => {
      const controllerKey = Buffer.allocUnsafe(32);
      const metadata = {
        service: [
          {
            id: 'linked-domain1',
            serviceEndpoint: 'https://didservice.com',
          },
        ],
      };

      const multikeys = pubkeys.map((pubkey) => {
        return prependCodecToKey(pubkey, 'ed25519-pub');
      });
      const verificationRelationshipFlags = [
        defaultVerificationRelationshipFlags,
        VerificationRelationshipFlags.AUTHENTICATION |
          VerificationRelationshipFlags.ASSERTION |
          VerificationRelationshipFlags.KEY_AGREEMENT |
          VerificationRelationshipFlags.CAPABILITY_DELEGATION |
          VerificationRelationshipFlags.CAPABILITY_INVOCATION,
        VerificationRelationshipFlags.ASSERTION,
      ];
      const did: Did = {
        verificationMethods: [
          {
            multikey: multikeys[0],
            verificationRelationshipFlags: verificationRelationshipFlags[0],
          },
          {
            multikey: multikeys[1],
            verificationRelationshipFlags: verificationRelationshipFlags[1],
          },
          {
            multikey: multikeys[2],
            verificationRelationshipFlags: verificationRelationshipFlags[2],
          },
        ],
        controllerKey,
        metadata,
      };

      const didId = 'did:btc:8q7p-v92k-prqq-7s2k-6a';
      const didDoc = buildDidDocument(did, didId);

      const controller = `did:key:${encodeMultikey(
        controllerKey,
        'secp256k1-pub',
      )}`;
      assert.deepStrictEqual(didDoc, {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/multikey/v1',
        ],
        id: didId,
        controller,
        verificationMethod: [
          {
            id: `${didId}#key-0`,
            type: 'Multikey',
            controller,
            publicKeyMultibase: encodeMultibase(multikeys[0]),
          },
          {
            id: `${didId}#key-1`,
            type: 'Multikey',
            controller,
            publicKeyMultibase: encodeMultibase(multikeys[1]),
          },
          {
            id: `${didId}#key-2`,
            type: 'Multikey',
            controller,
            publicKeyMultibase: encodeMultibase(multikeys[2]),
          },
        ],
        authentication: [`${didId}#key-0`, `${didId}#key-1`],
        assertion: [`${didId}#key-0`, `${didId}#key-1`, `${didId}#key-2`],
        keyAgreement: [`${didId}#key-1`],
        capabilityInvocation: [`${didId}#key-1`],
        capabilityDelegation: [`${didId}#key-1`],
        ...metadata,
      });
    });
  });

  describe('transactions', () => {
    const utxo = {
      txid: Buffer.from(
        '48452f42ac0accd63a0467f7e0406945320061bd19971bf34478582d76e85dbe',
        'hex',
      ),
      index: 1,
      value: 4131295,
    };

    const privkey = Buffer.from(
      'jjoSPe0Rb930tdPEJLSnf3i6coIBaWCqJXS8JUxrCww=',
      'base64',
    );

    const satsPerVByte = 17;

    const updatedPubkeys = [
      'dc1b32f3e3756160c48fa1f74f7d7651aea38d30a6a6e2f759fd7f423d4338e8',
      '4c0a076e0400c35d3d312131c10c71a8e95c4db7cbb1b558e218af23ae08168c',
      '2bca2c074ec4f7aa03279de6f724430e00aa196111ad158ad8b2f34b83c9152f',
    ].map((pubkey) => Buffer.from(pubkey, 'hex'));

    const creationTxHex =
      '01000000000101be5de8762d587844f31b9719bd610032456940e0f767043ad6cc0aac422f45480100000000ffffffff030000000000000000286a2664696403ed01988403912c92a9e10a384620a5eb6579da156b6d48fbe08dc5815d4abef388234a010000000000002251205daf8e901f08dcf171e6bfea8a75cf9d312a489651203720de899bf3728f1b9e1afb3e00000000002251205daf8e901f08dcf171e6bfea8a75cf9d312a489651203720de899bf3728f1b9e014003a115576176bc0cafcc2dbc9cccfad94737476fc3a8e15bc217756694eaa8e715cac8e9d60051c613cdc64236f23d5b639df1c67b8cb24a6f0fe221161f393600000000';
    const batchCreationTxHex =
      '010000000001016287f37e2ed77d8e5e1bf5195b6b077d6e5dfc007e85d1ce25e9cae710d291680000000000ffffffff014a010000000000002251205daf8e901f08dcf171e6bfea8a75cf9d312a489651203720de899bf3728f1b9e0340df7658f7d09a34683bf17a917fd048c7dc5c9ace14b0cd4dd0f388221075d0ff625b3644f4e48c0d028b6051181d2b601ef68606cac3cf82d5082dd07320b2e58e205daf8e901f08dcf171e6bfea8a75cf9d312a489651203720de899bf3728f1b9eac00634c6764696473ed0103988403912c92a9e10a384620a5eb6579da156b6d48fbe08dc5815d4abef38823b9b624758eea864d3268ac5d999e1b0ac3167313bc85ed1804b7d6713904a608548edbd592684fdf0a2a159d0f8845f22fdec8dc1f56d2209cb53acdb20f3d886821c0684a27dce671f9d17f4a25763a83a68ab4f9df58aa5db92aa488499f4f0f37bd00000000';

    const ed25519Codec = codecs['ed25519-pub'];
    const verificationRelationshipFlags =
      (VerificationRelationshipFlags.ASSERTION |
        VerificationRelationshipFlags.AUTHENTICATION) as VerificationRelationshipFlags;

    it('creates a single did', () => {
      const transaction = buildDidCreationTransaction({
        multikey: prependCodecToKey(pubkeys[0], 'ed25519-pub'),
        walletUtxos: [{ utxo, privkey }],
        satsPerVByte,
        network,
      });

      assert.strictEqual(transaction.txHex, creationTxHex);
    });

    it('deactivates a single did', () => {
      const transaction = buildDidDeactivationTransaction({
        didUtxo: utxo,
        didPrivkey: privkey,
        satsPerVByte,
        network,
      });

      const deactivatedDid = resolveDidBtc([creationTxHex, transaction.txHex]);
      assert(deactivatedDid.isDeactivated);
    });

    it('creates a single did with a custom change address', () => {
      const changeAddress = 'tb1q5w48rgj6ysqx5xln5eun25pq7qc9wu7lw3merp';
      const transaction = buildDidCreationTransaction({
        multikey: prependCodecToKey(pubkeys[0], 'ed25519-pub'),
        walletUtxos: [{ utxo, privkey }],
        satsPerVByte,
        network,
        changeAddress,
      });

      const tx = Transaction.fromHex(transaction.txHex);
      const txChangeAddress = fromOutputScript(
        tx.outs[2].script,
        networks[network],
      );
      assert.strictEqual(txChangeAddress, changeAddress);
    });

    it('resolves a single did creation transaction', () => {
      const did = resolveDidBtc([creationTxHex]);
      const doc = buildDidDocument(did, 'did:btc:8q7p-v92k-prqq-7s2k-6a');
      doc ?? '';

      assert.strictEqual(did.verificationMethods.length, 1);
      assert.strictEqual(
        did.verificationMethods[0].verificationRelationshipFlags,
        verificationRelationshipFlags,
      );
      assert(
        did.verificationMethods[0].multikey
          .subarray(0, 2)
          .equals(ed25519Codec.prefix),
      );
      assert(
        did.verificationMethods[0].multikey.subarray(2).equals(pubkeys[0]),
      );
    });

    const changeIndex = 1;
    const changeValue = 4125695;
    const didUtxoIndex = 0;
    const didUtxoValue = 330;
    /**
     * @see https://blockstream.info/testnet/tx/6891d210e7cae925ced1857e00fc5d6e7d076b5b19f51b5e8e7dd72e7ef38762
     */
    const commitTxid =
      '6891d210e7cae925ced1857e00fc5d6e7d076b5b19f51b5e8e7dd72e7ef38762';
    /**
     * @see https://blockstream.info/testnet/tx/de7523bc733b5195025583a72eafc55aa636e0a7a536e87c5ebb1ae79df42252
     */
    const revealTxid =
      'de7523bc733b5195025583a72eafc55aa636e0a7a536e87c5ebb1ae79df42252';
    it('creates dids in batch', () => {
      const transactions = buildBatchDidCreationTransactions({
        walletUtxos: [{ utxo, privkey }],
        satsPerVByte,
        pubkeys,
        verificationRelationshipFlags,
        codec: ed25519Codec,
        network,
      });

      assert.strictEqual(
        transactions.revealTransaction.txHex,
        batchCreationTxHex,
      );
      assert.strictEqual(
        transactions.commitTransaction.txid.toString('hex'),
        commitTxid,
      );
      assert.strictEqual(
        transactions.revealTransaction.txid.toString('hex'),
        revealTxid,
      );
      assert.strictEqual(
        transactions.revealTransaction.didUtxoIndex,
        didUtxoIndex,
      );
      assert.strictEqual(
        transactions.revealTransaction.didUtxoValue,
        didUtxoValue,
      );
      assert(isBitcoinTransactionWithChange(transactions.commitTransaction));
      assert.strictEqual(
        transactions.commitTransaction.changeIndex,
        changeIndex,
      );
      assert.strictEqual(
        transactions.commitTransaction.changeValue,
        changeValue,
      );
    });

    it('resolves a batch creation transaction', () => {
      const did0 = resolveDidBtc([batchCreationTxHex], 0);
      const did1 = resolveDidBtc([batchCreationTxHex], 1);
      const did2 = resolveDidBtc([batchCreationTxHex], 2);

      const expectedControllerKey = new TaprootKey(privkey).tweakedPubkey;
      assert(did0.controllerKey);
      assert(did0.controllerKey.equals(expectedControllerKey));
      assert.strictEqual(did0.verificationMethods.length, 1);
      assert.strictEqual(
        did0.verificationMethods[0].verificationRelationshipFlags,
        verificationRelationshipFlags,
      );
      assert(
        did0.verificationMethods[0].multikey
          .subarray(0, 2)
          .equals(ed25519Codec.prefix),
      );

      assert(
        did0.verificationMethods[0].multikey.subarray(2).equals(pubkeys[0]),
      );
      assert(
        did1.verificationMethods[0].multikey.subarray(2).equals(pubkeys[1]),
      );
      assert(
        did2.verificationMethods[0].multikey.subarray(2).equals(pubkeys[2]),
      );
    });

    function updateDidInBatch(
      didIndexes: number[],
      didUtxo: Utxo,
      walletUtxo: WalletUtxo,
      txHexes: string[],
    ) {
      const updates = didIndexes.map((didIndex) => {
        const did = resolveDidBtc(txHexes, didIndex);

        const update: BatchDidUpdate = {
          i: didIndex,
          did: did,
          update: {
            vm: [
              {
                i: 0,
                k: encodeMultikey(updatedPubkeys[didIndex], 'ed25519-pub'),
              },
            ],
          },
        };
        return update;
      });

      const { revealTransaction, commitTransaction } =
        buildBatchDidUpdateTransactions({
          didUtxo,
          walletUtxos: [walletUtxo],
          didPrivkey: privkey,
          satsPerVByte,
          updates,
          network,
        });
      assert(isBitcoinTransactionWithChange(commitTransaction));
      assert(revealTransaction.didUtxoIndex !== undefined);
      assert(revealTransaction.didUtxoValue === didUtxoValue);

      // resolve updated dids to confirm the key has been updated
      didIndexes.forEach((didIndex) => {
        const updatedDid = resolveDidBtc(
          [...txHexes, revealTransaction.txHex],
          didIndex,
        );

        assert(
          updatedDid.verificationMethods[0].multikey
            .subarray(2)
            .equals(updatedPubkeys[didIndex]),
        );
      });

      return {
        txHex: revealTransaction.txHex,
        txid: revealTransaction.txid.toString('hex'),
        didUtxo: {
          txid: revealTransaction.txid,
          index: revealTransaction.didUtxoIndex,
          value: revealTransaction.didUtxoValue,
        },
        walletUtxo: {
          utxo: {
            txid: commitTransaction.txid,
            index: commitTransaction.changeIndex,
            value: commitTransaction.changeValue,
          },
          privkey,
        },
      };
    }

    const didUtxo = {
      txid: Buffer.from(revealTxid, 'hex'),
      index: didUtxoIndex,
      value: didUtxoValue,
    };
    const walletUtxo = {
      utxo: {
        txid: Buffer.from(commitTxid, 'hex'),
        index: changeIndex,
        value: changeValue,
      },
      privkey,
    };

    it('updates a did with index 0 then dids with indexes 1 and 2 within a batch of dids', () => {
      const {
        txid: firstUpdateTxid,
        txHex: firstUpdateTxHex,
        didUtxo: firstUpdateDidUtxo,
        walletUtxo: firstUpdateWalletUtxo,
      } = updateDidInBatch([0], didUtxo, walletUtxo, [batchCreationTxHex]);

      assert.strictEqual(
        firstUpdateTxid,
        // https://blockstream.info/testnet/tx/a722f00dc17aba62689f51e6dc790f52f6320ff6f2a7b404377e382370782814
        'a722f00dc17aba62689f51e6dc790f52f6320ff6f2a7b404377e382370782814',
      );

      const { txid: secondUpdateTxid } = updateDidInBatch(
        [1, 2],
        firstUpdateDidUtxo,
        firstUpdateWalletUtxo,
        [batchCreationTxHex, firstUpdateTxHex],
      );

      assert.strictEqual(
        secondUpdateTxid,
        // https://blockstream.info/testnet/tx/82b011145bf47ff2caf3db2c342946cb1a9afadca1b4b6f19534b47145cc647c
        '82b011145bf47ff2caf3db2c342946cb1a9afadca1b4b6f19534b47145cc647c',
      );
    });

    it('deactivates a did with index 1 in a batch', () => {
      const { revealTransaction } = buildBatchDidUpdateTransactions({
        didUtxo,
        walletUtxos: [walletUtxo],
        didPrivkey: privkey,
        satsPerVByte,
        deactivationIndexes: [1],
        network,
      });

      const deactivatedDid = resolveDidBtc(
        [batchCreationTxHex, revealTransaction.txHex],
        1,
      );

      assert(deactivatedDid.isDeactivated);
    });
  });
});

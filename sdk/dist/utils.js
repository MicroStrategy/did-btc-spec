import * as bip136 from 'bip136';
import { VerificationRelationshipFlags } from './consts.js';
import { encodeMultibase, encodeMultikey } from './encoding.js';
/**
 * The prefix for the did:btc method that is prepended to the unique suffix
 */
export const DID_BTC_PREFIX = 'did:btc:';
/**
 * Returns the did:btc method prefix for the given network
 * @param network Either 'mainnet' or 'testnet' - testnet has an additional 'test:' prefix in the
 * identifier. If no network is provided, defaults to 'mainnet'.
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getDidPrefix(network = 'mainnet') {
    if (network !== 'mainnet' && network !== 'testnet' && network !== 'regtest') {
        throw new Error(`Unsupported network: ${network}`);
    }
    return network === 'mainnet' ? DID_BTC_PREFIX : DID_BTC_PREFIX + 'test:';
}
export function extractDidUniqueSuffix(did) {
    return did.substring(did.lastIndexOf(':') + 1);
}
/**
 * Encodes the given data components into a did:btc identifier string.
 * @param didBtcIdentifier The data components to be encoded in the did:btc id.
 * @returns
 */
export function encodeDidBtc({ blockHeight, txIndex, didIndex, network = 'mainnet', }) {
    const didRef = bip136.encode({
        blockHeight,
        txIndex,
        network,
        outpoint: didIndex,
    });
    const separatorIndex = didRef.indexOf(':');
    return `${getDidPrefix(network)}${didRef.substring(separatorIndex + 1)}`;
}
function getVerificationMethodsByRelationship(verificationMethods, vr, id) {
    const relationships = [];
    verificationMethods.forEach((vm, i) => {
        if (vm.verificationRelationshipFlags & vr) {
            relationships.push(`${id}#key-${i}`);
        }
    });
    return relationships.length > 0 ? relationships : undefined;
}
/**
 * Builds a DID document using the provided DID data.
 * @param did
 * @param id The did:btc identifier for the DID.
 * @returns A DID document conforming to the W3C DID specification.
 */
export function buildDidDocument({ verificationMethods, controllerKey, metadata }, id) {
    const controllerMultikey = controllerKey
        ? encodeMultikey(controllerKey, 'secp256k1-pub')
        : undefined;
    const controller = `did:key:${controllerMultikey}`;
    const verificationMethod = verificationMethods.map((vm, i) => {
        return {
            id: `${id}#key-${i}`,
            controller,
            type: 'Multikey',
            publicKeyMultibase: encodeMultibase(vm.multikey),
        };
    });
    return {
        '@context': [
            'https://www.w3.org/ns/did/v1',
            'https://w3id.org/security/multikey/v1',
        ],
        id,
        controller,
        verificationMethod,
        authentication: getVerificationMethodsByRelationship(verificationMethods, VerificationRelationshipFlags.AUTHENTICATION, id),
        assertion: getVerificationMethodsByRelationship(verificationMethods, VerificationRelationshipFlags.ASSERTION, id),
        keyAgreement: getVerificationMethodsByRelationship(verificationMethods, VerificationRelationshipFlags.KEY_AGREEMENT, id),
        capabilityInvocation: getVerificationMethodsByRelationship(verificationMethods, VerificationRelationshipFlags.CAPABILITY_INVOCATION, id),
        capabilityDelegation: getVerificationMethodsByRelationship(verificationMethods, VerificationRelationshipFlags.CAPABILITY_DELEGATION, id),
        ...metadata,
    };
}
/**
 * Returns whether the given DID is a did:btc identifier
 */
export function isDidBtc(did) {
    return did.startsWith(DID_BTC_PREFIX);
}
/**
 * Decodes a did:btc identifier string into its data components.
 */
export function decodeDidBtc(id) {
    if (isDidBtc(id)) {
        const uniqueSuffix = extractDidUniqueSuffix(id);
        const { blockHeight, txIndex, outpoint, network } = bip136.decode(uniqueSuffix);
        return { blockHeight, txIndex, network, didIndex: outpoint ?? 0 };
    }
    else {
        throw new Error(`Unsupported DID method: ${id}`);
    }
}

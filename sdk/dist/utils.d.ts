import { Did, DidBtcIdentifier, DidDocument, Network } from './types.js';
/**
 * The prefix for the did:btc method that is prepended to the unique suffix
 */
export declare const DID_BTC_PREFIX = "did:btc:";
/**
 * Returns the did:btc method prefix for the given network
 * @param network Either 'mainnet' or 'testnet' - testnet has an additional 'test:' prefix in the
 * identifier. If no network is provided, defaults to 'mainnet'.
 * @returns
 */
export declare function getDidPrefix(network?: Network): string;
export declare function extractDidUniqueSuffix(did: string): string;
/**
 * Encodes the given data components into a did:btc identifier string.
 * @param didBtcIdentifier The data components to be encoded in the did:btc id.
 * @returns
 */
export declare function encodeDidBtc({ blockHeight, txIndex, didIndex, network, }: DidBtcIdentifier): string;
/**
 * Builds a DID document using the provided DID data.
 * @param did
 * @param id The did:btc identifier for the DID.
 * @returns A DID document conforming to the W3C DID specification.
 */
export declare function buildDidDocument({ verificationMethods, controllerKey, metadata }: Did, id: string): DidDocument;
/**
 * Returns whether the given DID is a did:btc identifier
 */
export declare function isDidBtc(did: string): boolean;
/**
 * Decodes a did:btc identifier string into its data components.
 */
export declare function decodeDidBtc(id: string): DidBtcIdentifier;

/// <reference types="node" resolution-mode="require"/>
export declare const supportedCodecs: readonly ["secp256k1-pub", "ed25519-pub"];
export type CodecName = (typeof supportedCodecs)[number];
/**
 * The codec indicating the key type of the provided public keys. This is a byte array using
 * varint encoding that corresponds to a multicodec value indicating a key type. The default value
 * is 0xed01 which corresponds to ed25519 public keys.
 * @see https://github.com/multiformats/multicodec/blob/master/table.csv
 * @see https://github.com/multiformats/unsigned-varint
 * @see https://github.com/multiformats/multicodec
 */
export type Codec = {
    name: CodecName;
    prefix: Buffer;
    pubkeyLength: number;
};
/**
 * Codec prefix values according to the multicodec standard encoded as unsigned varints.
 * @see https://github.com/multiformats/multicodec/blob/master/table.csv.
 * @see https://github.com/multiformats/unsigned-varint
 */
export declare const codecs: Record<CodecName, Codec>;
export type DecodedKey = {
    codecName: CodecName;
    bytes: Uint8Array;
};
/**
 * Prepends the specified codec prefix to the bytes of a key.
 */
export declare function prependCodecToKey(bytes: Uint8Array, codec: CodecName): Buffer;
/**
 * Encodes a public key with a codec prefix using multibase base58 encoding.
 * @see https://w3c-ccg.github.io/multibase/
 */
export declare function encodeMultikey(bytes: Uint8Array, codec: CodecName): string;
/**
 * Decodes a multikey encoded with multibase base58 encoding.
 */
export declare function decodeMultikey(multikey: string): DecodedKey;
/**
 * Encodes bytes as multibase base58.
 */
export declare function encodeMultibase(bytes: Uint8Array): string;
/**
 * Decodes a string in multibase base58 encoding.
 */
export declare function decodeMultibase(multibase: string): Uint8Array;

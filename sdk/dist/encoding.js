import bs58 from 'bs58';
export const supportedCodecs = ['secp256k1-pub', 'ed25519-pub'];
/**
 * Codec prefix values according to the multicodec standard encoded as unsigned varints.
 * @see https://github.com/multiformats/multicodec/blob/master/table.csv.
 * @see https://github.com/multiformats/unsigned-varint
 */
export const codecs = {
    'secp256k1-pub': {
        name: 'secp256k1-pub',
        prefix: Buffer.from([0xe7, 0x01]),
        pubkeyLength: 33,
    },
    'ed25519-pub': {
        name: 'ed25519-pub',
        prefix: Buffer.from([0xed, 0x01]),
        pubkeyLength: 32,
    },
};
/**
 * Prepends the specified codec prefix to the bytes of a key.
 */
export function prependCodecToKey(bytes, codec) {
    return Buffer.from([...codecs[codec].prefix, ...bytes]);
}
/**
 * Encodes a public key with a codec prefix using multibase base58 encoding.
 * @see https://w3c-ccg.github.io/multibase/
 */
export function encodeMultikey(bytes, codec) {
    return 'z' + bs58.encode(prependCodecToKey(bytes, codec));
}
function getCodecName(prefix) {
    for (const [codecName, codec] of Object.entries(codecs)) {
        if (codec.prefix.equals(prefix)) {
            return codecName;
        }
    }
    throw new Error(`unrecognized codec ${prefix.toString('hex')}`);
}
/**
 * Decodes a multikey encoded with multibase base58 encoding.
 */
export function decodeMultikey(multikey) {
    const prefix = multikey[0];
    if (prefix === 'z') {
        const decoded = Buffer.from(bs58.decode(multikey.substring(1)));
        const bytes = decoded.subarray(2);
        const codecName = getCodecName(decoded.subarray(0, 2));
        return { bytes, codecName };
    }
    else {
        throw new Error(`unsupported multibase prefix ${prefix}`);
    }
}
/**
 * Encodes bytes as multibase base58.
 */
export function encodeMultibase(bytes) {
    return 'z' + bs58.encode(bytes);
}
/**
 * Decodes a string in multibase base58 encoding.
 */
export function decodeMultibase(multibase) {
    const prefix = multibase[0];
    if (prefix === 'z') {
        const bytes = bs58.decode(multibase.substring(1));
        return bytes;
    }
    else {
        throw new Error('unsupported multibase prefix');
    }
}

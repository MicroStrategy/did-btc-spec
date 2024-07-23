import bs58 from 'bs58';

export const supportedCodecs = ['secp256k1-pub', 'ed25519-pub'] as const;
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
export const codecs: Record<CodecName, Codec> = {
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

export type DecodedKey = {
  codecName: CodecName;
  bytes: Uint8Array;
};

/**
 * Prepends the specified codec prefix to the bytes of a key.
 */
export function prependCodecToKey(bytes: Uint8Array, codec: CodecName): Buffer {
  return Buffer.from([...codecs[codec].prefix, ...bytes]);
}

/**
 * Encodes a public key with a codec prefix using multibase base58 encoding.
 * @see https://w3c-ccg.github.io/multibase/
 */
export function encodeMultikey(bytes: Uint8Array, codec: CodecName): string {
  return 'z' + bs58.encode(prependCodecToKey(bytes, codec));
}

function getCodecName(prefix: Buffer): CodecName {
  for (const [codecName, codec] of Object.entries(codecs)) {
    if (codec.prefix.equals(prefix)) {
      return codecName as CodecName;
    }
  }

  throw new Error(`unrecognized codec ${prefix.toString('hex')}`);
}

/**
 * Decodes a multikey encoded with multibase base58 encoding.
 */
export function decodeMultikey(multikey: string): DecodedKey {
  const prefix = multikey[0];
  if (prefix === 'z') {
    const decoded = Buffer.from(bs58.decode(multikey.substring(1)));
    const bytes = decoded.subarray(2);
    const codecName = getCodecName(decoded.subarray(0, 2));
    return { bytes, codecName };
  } else {
    throw new Error(`unsupported multibase prefix ${prefix}`);
  }
}

/**
 * Encodes bytes as multibase base58.
 */
export function encodeMultibase(bytes: Uint8Array): string {
  return 'z' + bs58.encode(bytes);
}

/**
 * Decodes a string in multibase base58 encoding.
 */
export function decodeMultibase(multibase: string): Uint8Array {
  const prefix = multibase[0];
  if (prefix === 'z') {
    const bytes = bs58.decode(multibase.substring(1));
    return bytes;
  } else {
    throw new Error('unsupported multibase prefix');
  }
}

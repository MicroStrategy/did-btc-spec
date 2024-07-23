/// <reference types="node" resolution-mode="require"/>
export declare class TaprootKey {
    readonly internalPrivkey: Uint8Array;
    readonly tweakedPrivkey: Uint8Array;
    readonly internalPubkey: Buffer;
    readonly tweakedPubkey: Buffer;
    readonly address: string;
    readonly output: Buffer;
    constructor(internalPrivkey: Uint8Array);
}

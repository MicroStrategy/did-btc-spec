/// <reference types="node" resolution-mode="require"/>
import { VerificationRelationshipFlags } from '../consts.js';
/**
 * The minimum value for a standard p2tr output.
 * @see https://bitcoin.stackexchange.com/a/41082/61300
 */
export declare const DUST_LIMIT = 330;
/**
 * The maximum size of a stack element in bitcoin.
 * @see https://en.bitcoin.it/wiki/BIP_0342#Resource_limits
 */
export declare const STACK_ELEMENT_SIZE_LIMIT = 520;
/**
 * The default verification relationship flags used for new DIDs or verification methods.
 * This value is a bitwise OR of the AUTHENTICATION and ASSERTION flags.
 */
export declare const defaultVerificationRelationshipFlags: VerificationRelationshipFlags;
/**
 * The output script for an OP_RETURN that deactivates a single DID.
 */
export declare const DEACTIVATION_OP_RETURN_OUTPUT: Buffer;

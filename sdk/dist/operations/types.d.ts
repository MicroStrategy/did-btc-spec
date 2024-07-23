import { VerificationMethodAppend, VerificationMethodDeletion, VerificationMethodOperation, VerificationMethodUpdate } from '../types.js';
export declare function isVerificationMethodOperation(obj: unknown): obj is VerificationMethodOperation;
export declare function isVerificationMethodDeletion(obj: VerificationMethodOperation): obj is VerificationMethodDeletion;
export declare function isVerificationMethodUpdate(obj: VerificationMethodOperation): obj is VerificationMethodUpdate;
export declare function isVerificationMethodAppend(obj: VerificationMethodOperation): obj is VerificationMethodAppend;

import {
  VerificationMethodAppend,
  VerificationMethodDeletion,
  VerificationMethodOperation,
  VerificationMethodUpdate,
} from '../types.js';

export function isVerificationMethodOperation(
  obj: unknown,
): obj is VerificationMethodOperation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (('i' in obj && typeof obj.i === 'number') ||
      ('k' in obj && typeof obj.k === 'string') ||
      ('vr' in obj && typeof obj.vr === 'number'))
  );
}

export function isVerificationMethodDeletion(
  obj: VerificationMethodOperation,
): obj is VerificationMethodDeletion {
  return (
    'i' in obj && typeof obj.i === 'number' && !('k' in obj || 'vr' in obj)
  );
}

export function isVerificationMethodUpdate(
  obj: VerificationMethodOperation,
): obj is VerificationMethodUpdate {
  return (
    'i' in obj &&
    typeof obj.i === 'number' &&
    (('k' in obj && typeof obj.k === 'string') ||
      ('vr' in obj && typeof obj.vr === 'number'))
  );
}

export function isVerificationMethodAppend(
  obj: VerificationMethodOperation,
): obj is VerificationMethodAppend {
  return (
    'k' in obj &&
    typeof obj.k === 'string' &&
    'vr' in obj &&
    typeof obj.vr === 'number'
  );
}

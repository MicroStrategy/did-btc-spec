export function isVerificationMethodOperation(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        (('i' in obj && typeof obj.i === 'number') ||
            ('k' in obj && typeof obj.k === 'string') ||
            ('vr' in obj && typeof obj.vr === 'number')));
}
export function isVerificationMethodDeletion(obj) {
    return ('i' in obj && typeof obj.i === 'number' && !('k' in obj || 'vr' in obj));
}
export function isVerificationMethodUpdate(obj) {
    return ('i' in obj &&
        typeof obj.i === 'number' &&
        (('k' in obj && typeof obj.k === 'string') ||
            ('vr' in obj && typeof obj.vr === 'number')));
}
export function isVerificationMethodAppend(obj) {
    return ('k' in obj &&
        typeof obj.k === 'string' &&
        'vr' in obj &&
        typeof obj.vr === 'number');
}

const Long = require("long");

const base32 = require('base32.js');

export function fixBase32Padding(input) {
    const noPadding = input.replace(/=+$/, '');
    const paddingNeeded = (8 - (noPadding.length % 8)) % 8;
    return noPadding + '='.repeat(paddingNeeded);
}

export function encodeLongLongInt(valueStr) {
    const longVal = Long.fromString(valueStr); // Supports large integers
    const bytes = longVal.toBytesBE(); // Big-endian byte array (8 bytes)

    return Uint8Array.from(bytes);
}

function decodeBase32ToArrayBuffer(base32Str) {
    const decoder = new base32.Decoder();
    const uint8Array = decoder.write(base32Str).finalize();


    const newArrayBuffer = new Uint8Array(uint8Array).buffer

    console.log('UINT8')
    console.log(uint8Array)
    console.log(typeof uint8Array)
    console.log('Buffer')
    console.log(newArrayBuffer)
    // Convert Uint8Array to ArrayBuffer

    return newArrayBuffer
}
import { fixBase32Padding, encodeLongLongInt } from './base32-utilities';

const base32Decode = require('base32-decode')

export async function hmacSha1(key, countInt) {
    const paddedKey = fixBase32Padding(key)
    const keyRawBytes = base32Decode(paddedKey, 'RFC4648')
    
    // Import the secret key
    const cryptoKey = await crypto.subtle.importKey(
        'raw', 
        keyRawBytes, 
        { name: 'HMAC', hash: 'SHA-1' }, 
        false, 
        ['sign']
    );
    
    // Sign the message using the key
    const signature = await crypto.subtle.sign(
        'HMAC', 
        cryptoKey, 
        encodeLongLongInt(String(countInt))
    );
    
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(signature));
    
    return hashArray;
}
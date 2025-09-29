
export function GenerateBase32SecretKey() {
    var randomstring = require("randomstring");

    const outputStr = randomstring.generate();

    const base32 = require('hi-base32');
    const encoded = base32.encode(outputStr)

    return encoded
}

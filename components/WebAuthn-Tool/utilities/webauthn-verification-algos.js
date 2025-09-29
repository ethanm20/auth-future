

export async function verifyES256(publicKeyRaw, signatureRaw, authenticatorDataJSONRaw, setAssertionVerified) {
    //Process Signature
    var usignature = new Uint8Array(signatureRaw);
    var rStart = usignature[4] === 0 ? 5 : 4;
    var rEnd = rStart + 32;
    var sStart = usignature[rEnd + 2] === 0 ? rEnd + 3 : rEnd + 2;
    var r = usignature.slice(rStart, rEnd);
    var s = usignature.slice(sStart);
    var rawSignature = new Uint8Array([...r, ...s]);

    let publicKeyECDSA = await crypto.subtle.importKey(
        'spki', // Format of the key
        publicKeyRaw, // ArrayBuffer from PEM
        {
            name: 'ECDSA',
            namedCurve: 'P-256',
            hash: { name: "SHA-256" }   //added
        },
        false, //true
        ['verify']
    );

    let verified = await crypto.subtle.verify(
            {
                name: 'ECDSA',
                namedCurve: "P-256", //added
                hash: { name: 'SHA-256' }
            },
            publicKeyECDSA,
            rawSignature, // Signature from authenticator
            authenticatorDataJSONRaw // authData + SHA256(clientDataJSON)
    );

    console.log('Verified ECDSA');
    console.log(verified);

    if (verified) {
        setAssertionVerified(true)
    }


}

export async function verifyRS256(publicKeyRaw, signatureRaw, authenticatorDataJSONRaw, setAssertionVerified) {
    
    let publicKeyRSA = await crypto.subtle.importKey(
        'spki',                // Format of the key
        publicKeyRaw,             // ArrayBuffer from PEM
        {
            name: 'RSASSA-PKCS1-v1_5',  // or 'RSA-PSS'
            hash: { name: 'SHA-256' }
        },
        true,
        ['verify']
    );
    let verified = await crypto.subtle.verify(
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: { name: 'SHA-256' }
        },
        publicKeyRSA,
        signatureRaw,       // Signature from authenticator
        authenticatorDataJSONRaw      // authData + SHA256(clientDataJSON)
        );
    //console.log('Verified RSA')
    //console.log(verified)

    if (verified) {
        setAssertionVerified(true)
    }
}
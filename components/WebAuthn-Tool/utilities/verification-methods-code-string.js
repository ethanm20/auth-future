import { getAlgoDetails } from "./getter-functions";
import { getCredentialArrayStr } from "./getter-functions";

export function renderLoginPublicKeyJSON(assertionData, savedCredentials) {
    if (getAlgoDetails(assertionData.id, savedCredentials)['algoName'] == 'RS256') {
        return `
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
                    `
    } else if (getAlgoDetails(assertionData.id, savedCredentials)['algoName'] == 'ES256') {
        return `
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
                    `
    }

}


export function renderLoginVerifyJSON(assertionData, savedCredentials) {
    if (getAlgoDetails(assertionData.id, savedCredentials)['algoName'] == 'RS256') {
        return `
                    let verified = await crypto.subtle.verify(
                        {
                        name: 'RSASSA-PKCS1-v1_5',
                        hash: { name: 'SHA-256' }
                        },
                        Base64.decode(assertation.publicKeyRSA),        // Public Key sourced from Passkey Registration (Assertation stage)
                        Base64.decode(assertion.signatureRaw),          // Assertion Signature
                        Base64.decode(assertion.authenticatorDataJSON)  // authData + SHA256(clientDataJSON)
                    );
                    `
    } else if (getAlgoDetails(assertionData.id, savedCredentials)['algoName'] == 'ES256') {
        return `
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
                    `
    }

}

export function renderLoginRetrievalJSON(passwordlessMode, challenge, savedCredentials) {
    if (passwordlessMode == false) {
        return `
                    navigator.credentials.get(
                        "publicKey": {
                            "challenge": Uint8Array.from("${challenge}"),
                            "rpId": "authfuture.com", 
                            allowCredentials: ${getCredentialArrayStr(savedCredentials)},
                            "userVerification": "preferred",
                        }
                    )
                    `
    } else {
        return `
                    navigator.credentials.get(
                        "publicKey": {
                            "challenge": Uint8Array.from("${challenge}"),
                            "rpId": "authfuture.com", 
                            "userVerification": "preferred",
                        }
                    )
                    `
    }
}
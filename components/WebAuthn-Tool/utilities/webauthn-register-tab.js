export function PasskeyTabTitle() {
    return (
        <>
            <div id="passkey-tab-title" style={{color: '#FFF', backgroundColor: '#2a2a2a'}}><h4>Create New Passkey</h4></div>
        </>
    )
}

export function renderPasskeyRegisterTab() {
    if (registerNewPasskeyTab === 1) {
        return (
            <>
                {PasskeyTabTitle()}
                {RenderPasskeyRegisterTabPage1()}
            </>
        )
    } else if (registerNewPasskeyTab === 2) {
        return (
            <>
                {PasskeyTabTitle()}
                {RenderPasskeyRegisterTabPage2()}
            </>
        )
    } 
}


export function registerPasskey(username, fullname, challenge) {
    setDisplaySpinner(true)

    navigator.credentials.create({
        "publicKey": {
            "challenge": Base64Binary.decode(challenge),
            "rp": {
                "id": window.location.hostname, 
                "name": "AuthFuture"
            },
            "user": {
                "id": Uint8Array.from('user-id-1234', c => c.charCodeAt(0)),
                "name": username,
                "displayName": fullname
            },
            "pubKeyCredParams": [ 
                {
                    "type": "public-key",
                    "alg": -7,
                },
                {
                    "type": "public-key",
                    "alg": -257
                }
            ],
            "authenticatorSelection": {
                "userVerification": "preferred",
                "requireResidentKey": false
            },
            "excludeCredentials": getCredentialArray()
        }
    })
    .then((response) => {
        console.log('Returned')
        console.log(response)

        const decoder = new TextDecoder("utf-8");

        setCurrCredID(arrayBufferToBase64(response.rawId))
        setCurrPublicKey(arrayBufferToBase64(response.response.getPublicKey()))
        setCurrAlg(response.response.getPublicKeyAlgorithm())
        setCurrJSON(decoder.decode(response.response.clientDataJSON))
        setCurrTransports(response.response.getTransports())

        setDisplaySpinner(false)

        setRegisterNewPasskeyTab(2)
    })
}

export function finishPasskeyRegistration() {
    let newCredential = {
        'idNum': savedCredentials.length,
        'id': currCredID,
        'publicKey': currPublicKey,
        'clientDataJSON': currJSON,
        'alg': currAlg,
        'transports': currTransports
    }

    let newCredentialsList = []
    savedCredentials.forEach((item) => {
        newCredentialsList.push(item)
    })
    newCredentialsList.push(newCredential)

    setSavedCredentials(newCredentialsList)

    setRegisterNewPasskeyTab(0)

    console.log('Saved Creds')
    console.log(savedCredentials)
}
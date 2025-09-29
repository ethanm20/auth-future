export function getAlgoDetails(id, savedCredentials) {
    let output = {
        'algoNum': -7,
        'algoName': 'ES256'
    }

    savedCredentials.forEach((cred) => {
        if (cred.id === id) {
            output.algoNum = cred.alg
            if (output.algoNum === -7) {
                output.algoName = 'ES256'
            } else if (output.algoNum === -257) {
                output.algoName = 'RS256'
            }
        }
    })

    return output
}


export function getCredentialArrayStr(savedCredentials) {
    let creds = []

    savedCredentials.forEach((cred) => {
        creds.push({
            'id': cred.id,
            'type': 'public-key',
            'transports': cred.transports
        })
    })

    return JSON.stringify(creds, null, 20)
}
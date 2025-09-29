import { GenerateBase64SecretKey } from "../base64"

import { getCredentialArrayStr } from "../getter-functions"

import { registerPasskey } from "../webauthn-register-tab"

export function RenderPasskeyRegisterTabPage1(setChallenge, setFullname, setUsername, displaySpinner) {
    
    return (
        <>

            <h4>Step 1: Generating Passkey From Browser</h4>

            <p><b>Challenge: </b>{challenge} <Button variant="dark" onClick={(event) => {setChallenge(GenerateBase64SecretKey())}}><i class="bi bi-arrow-repeat"></i></Button></p>

            <form>
                <div>
                    <b>Display Name: </b><input type="text" value={fullname} onChange={(event) => {setFullname(event.target.value)}}></input>
                </div>
                <div>
                    <b>Username: </b><input type="text" value={username} onChange={(event) => {setUsername(event.target.value)}}></input>
                </div>
            </form>

            <span>Options provided to browser in navigate.credentials.create()</span>
            <pre>
                <SyntaxHighlighter language="javascript" style={coldarkDark}>
                    {`
                    navigator.credentials.create(
                        "publicKey": {
                            "challenge": Uint8Array.from("${challenge}"),
                            "rp": {
                                "id": "authfuture.com", 
                                "name": "AuthFuture"
                            },
                            "user": {
                                "id": 1,
                                "name": "${username}",
                                "displayName": "${fullname}"
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
                            "excludeCredentials": ${getCredentialArrayStr()}
                        }
                    )
                    `}    
                </SyntaxHighlighter>
            </pre>
            <div style={{display: 'flex', flexDirection: 'row', height: '40px', gap: '5px'}}>
                <Button variant="danger" onClick={toggleRegisterNewPasskeyTab}>Cancel</Button> <Button variant="success" onClick={(event) => {registerPasskey()}}>Register</Button> 
                <div style={{display: 'block', height: '40px', width: '40px'}}>
                    {displaySpinner && (<div class="spinner"></div>)}
                </div>
            </div>
        </>
    )
}


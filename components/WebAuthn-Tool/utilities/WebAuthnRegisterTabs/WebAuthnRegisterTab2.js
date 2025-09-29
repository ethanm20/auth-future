import { finishPasskeyRegistration } from "../webauthn-register-tab"

export function RenderPasskeyRegisterTabPage2(currCredID, currPublicKey, currAlg, currTransports, currJSON, challenge) {
    return (
        <>
            <h2>Step 2: Store Attestation Response</h2>

            <span>The following Attestation Response is returned from the navigator.credentials.create() function.</span><br/>

            <pre>
                <SyntaxHighlighter language="javascript" style={coldarkDark}>
                    {`
                    PublicKeyCredential {
                        id: "${currCredID}"
                        type: "public-key"
                        authenticatorAttachment: "platform"
                        response: AuthenticatorAttestationResponse {
                            AttestationObject: ArrayBuffer()
                            ClientDataJSON: ArrayBuffer()
                            getClientDataJSON()
                            getPublicKeyAlgorithm()
                            getAlgorithm()
                            getTransports()
                        }
                    }
                    `}

                </SyntaxHighlighter>
            </pre>

            <span><b>Credential ID: </b> {currCredID}</span><br/>

            <span><b>Public Key (Base 64): </b> {currPublicKey}</span><br/>

            <span><b>Algorithm:</b> {currAlg}</span><br/>

            <span><b>Transports: </b> {currTransports}</span><br/>

            <span><b>Client Data JSON:</b> </span><br/>

            <pre>
                <SyntaxHighlighter language="javascript" style={coldarkDark}>
                    {currJSON}
                </SyntaxHighlighter>
            </pre>

            <div style={{backgroundColor: 'green', border: '1px solid green', borderRadius: '20px', color: '#FFF', display: 'flex', flexDirection: 'row'}}>
                <div style={{width: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <i class="bi bi-check-circle-fill"></i>
                </div>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span><h3>Challenge Verified</h3></span>
                    <span><b>Challenge:</b> {challenge}</span>
                    <span>Set challenge matches challenge returned in Client Data JSON</span>
                </div>
            </div>

            <Button variant="danger" onClick={toggleRegisterNewPasskeyTab}>Cancel</Button> <Button variant="success" onClick={(event) => {finishPasskeyRegistration()}}>Finish</Button>
        </>
    )
}
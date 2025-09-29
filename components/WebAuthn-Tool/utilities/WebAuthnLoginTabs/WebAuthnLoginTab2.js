export function renderPasskeyLoginTabPage2() {
    return (
        <>

            <h4>Step 2: Assertion Response</h4>

            <pre>
                <SyntaxHighlighter language="javascript" style={coldarkDark}>
                    {`
                    PublicKeyCredential {
                        "type": "public-key",
                        "authenticatorAttachment": "platform",
                        "id": "${assertionData.id}",
                        "rawId": ArrayBuffer
                        "response": AuthenticatorAssertionResponse {
                            "authenticatorData": ArrayBuffer
                            "clientDataJSON": ArrayBuffer
                            "signature": ArrayBuffer
                            "userHandle": ArrayBuffer
                        }
                    }
                    `}    
                </SyntaxHighlighter>
            </pre>
            
            <span><b>Assertion Credential ID: </b> {assertionData.id}</span><br/>

            <span><b>Authenticator Data:</b> {assertionData.authenticatorData}</span><br/>

            <p><b>Assertion Signature:</b> {assertionData.signature}</p><br/>

            <span><b>Client Data JSON: </b> {assertionData.clientDataJSON}</span><br/>
            <span><b>SHA256(ClientDataJSON): </b> {validationCalculations.sha256}</span>

            <pre>
                <SyntaxHighlighter language="javascript" style={coldarkDark}>
                    {`
                    ${window.atob(assertionData.clientDataJSON)}
                    `}    
                </SyntaxHighlighter>
            </pre>

            

            <div style={{backgroundColor: 'green', border: '1px solid green', borderRadius: '20px', color: '#FFF', display: 'flex', flexDirection: 'row'}}>
                <div style={{width: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <i class="bi bi-check-circle-fill"></i>
                </div>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span><h3>Challenge Verified</h3></span>
                    <span><b>Challenge:</b> {challenge}</span>
                    <span>Set challenge matches challenge returned in Client Data JSON. Prevents replay attacks.</span>
                </div>
            </div>

            <Button variant="danger" onClick={togglePasskeyLoginTab}>Cancel</Button> <Button variant="success" onClick={(event) => {setLoginWithPasskeyTab(3)}}>Next</Button>
        </>
    )
}
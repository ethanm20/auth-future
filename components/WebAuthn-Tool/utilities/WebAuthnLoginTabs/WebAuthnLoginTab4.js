
export function renderPasskeyLoginTabPage4() {
    return (
        <>

            <h4>Step 4: Verification</h4>

            <p><b>Algorithm:</b> {getAlgoDetails(assertionData.id)['algoName']}</p>
            <p><b>Passkey #{getSavedCred(assertionData.id).idNum} Public Key: </b> {getPublicKey(assertionData.id)['publicKey']} </p>
            <p><b>Authenticator Data + SHA256(ClientDataJSON):</b> {validationCalculations.authenticatorJSONCombined}</p>
            <p><b>Assertion Signature:</b> {validationCalculations.signature}</p>

            <pre>
                <SyntaxHighlighter language="javascript" style={coldarkDark}>
                    {`
                    ${renderLoginVerifyJSON(assertionData, savedCredentials)}
                    `}    
                </SyntaxHighlighter>
            </pre>      
            {assertionVerified && (
            <div style={{backgroundColor: 'green', border: '1px solid green', borderRadius: '20px', color: '#FFF', display: 'flex', flexDirection: 'row'}}>
                <div style={{width: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <i class="bi bi-check-circle-fill"></i>
                </div>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span><h3>Passkey Login Successful - Assertion Verified</h3></span>
                    <span><b>Assertion Signature</b> decrypted with <b>Passkey #{getSavedCred(assertionData.id).idNum} Public Key</b> using <b>{getAlgoDetails(assertionData.id)['algoName']}</b> = SHA-256 Hash of <b>AuthenticatorData + SHA256(ClientDataJSON)</b></span>
                </div>
            </div> 
            )}
            {!assertionVerified && (
                <div className="alert alert-danger d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>
                        <h5 className="mb-1">Passkey Login Failed - Assertion Not Verified</h5>
                        The signature could not be verified. Please try again or register a new passkey.
                    </div>
                </div>
            )} 

            <Button variant="danger" onClick={togglePasskeyLoginTab}>Cancel</Button> <Button variant="success" 
                onClick={(event) => {
                setAssertionVerified(false)
                setLoginWithPasskeyTab(0)
                }}>Finish</Button>
        </>
    )
}
export function renderPasskeyLoginTabPage1() {
    return (
        <>

            <h4>Step 1: Get Passkey Assertion</h4>

            <p><b>Challenge: </b>{challenge}<Button variant="dark" onClick={(event) => {setChallenge(GenerateBase64SecretKey())}}><i class="bi bi-arrow-repeat"></i></Button></p>

            <p><label><input type="checkbox" name="passwordlessMode" checked={passwordlessMode} onChange={(event) => {setPasswordlessMode(event.target.checked)}}/><b> Enable Passwordless Mode</b> (Not available for passkeys with external/non-resident authenticators)</label></p>

            <span>Options provided to browser in navigate.credentials.get()</span>
            <pre>
                <SyntaxHighlighter language="javascript" style={coldarkDark}>
                    {`
                    ${renderLoginRetrievalJSON(passwordlessMode, challenge, savedCredentials)}
                    `}    
                </SyntaxHighlighter>
            </pre>
            <div style={{display: 'flex', flexDirection: 'row', height: '40px', gap: '5px'}}>
                <Button variant="danger" onClick={togglePasskeyLoginTab}>Cancel</Button> <Button variant="success" onClick={(event) => {verifyPasskey()}}>Verify</Button> 
                <div style={{display: 'block', height: '40px', width: '40px'}}>
                    {displaySpinner && (<div class="spinner"></div>)}
                </div>
            </div>
        </>
    )
}
export function renderPasskeyLoginTabPage3() {
    return (
        <>

            <h4>Step 3: Import Public Key of Matched Passkey</h4>

            <p><b>Assertion Credential ID:</b> {assertionData.id}</p>

            <div style={{backgroundColor: 'green', border: '1px solid green', borderRadius: '20px', color: '#FFF', display: 'flex', flexDirection: 'row'}}>
                <div style={{width: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <i class="bi bi-check-circle-fill"></i>
                </div>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span><h3>Assertion Credential ID Matched with Passkey #{getSavedCred(assertionData.id).idNum}</h3></span>
                    <span><b>Passkey #{getSavedCred(assertionData.id).idNum} Credential ID:</b> {assertionData.id}</span>
                </div>
            </div>

            <p><b>Passkey #{getSavedCred(assertionData.id).idNum} Public Key: </b> {getPublicKey(assertionData.id)['publicKey']} </p>
            <pre>
                <SyntaxHighlighter language="javascript" style={coldarkDark}>
                    {`
                    ${renderLoginPublicKeyJSON(assertionData, savedCredentials)}
                    `}    
                </SyntaxHighlighter>
            </pre>
            <br/>
            <br/>        

            <br/>

            <Button variant="danger" onClick={togglePasskeyLoginTab}>Cancel</Button> <Button variant="success" onClick={(event) => {setLoginWithPasskeyTab(4)}}>Verify</Button>
        </>
    )
}
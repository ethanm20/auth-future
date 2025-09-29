import {Button, Container, Modal, ButtonGroup, Accordion} from 'react-bootstrap';

function renderPasskeys(savedCredentials) {
    return (
        savedCredentials.map((item) => (
            <>
                <Accordion.Item class="webauthn-item" id={"webauthn-id" + item.idNum} eventKey={item.idNum} style={{width: '100%'}}>
                    <Accordion.Header><span>Passkey #{item.idNum}     <i>(ID: {item.id})</i> </span></Accordion.Header>
                    <Accordion.Body style={{textWrap: 'wrap', textWrapStyle: 'pretty', overflowWrap:'break-word'}}>
                        <span><b>Credential ID: </b> {item.id}</span><br/>

                        <span><b>Public Key (Base 64): </b> </span><br/>

                        <div style={{textWrap: 'wrap', textWrapStyle: 'pretty', overflowWrap:'break-word'}}>
                            <p style={{textWrap: 'wrap', textWrapStyle: 'pretty', overflowWrap:'break-word'}}>{item.publicKey}</p>
                        </div>

                        <span><b>Algorithm:</b> {item.alg}</span><br/>

                        <span><b>Transports: </b> {item.transports}</span><br/>

                        {(item.transports == 'internal') ? <div className="alert alert-success" role="alert">Passkey may be used in passwordless mode</div> : <div className="alert alert-danger" role="alert"><b>External Authenticator:</b> Unable to be used in passwordless mode</div>}


                    </Accordion.Body>
                </Accordion.Item>
            </>
        ))
    )
}

export function RenderListRegisteredPasskeys(savedCredentials) {
    if (savedCredentials.length == 0) {
        return (
            <>
                <div style={{border: '1px solid #000', borderStyle: 'dashed', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '50px', paddingBottom: '50px'}}>
                    <span>No registered passkeys.</span>
                </div>
            </>
        )
    } else {
        return (
            <>
                <div style={{border: '1px solid #000', borderStyle: 'dashed', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '50px', paddingBottom: '50px'}}>
                    <Accordion style={{maxWidth:'100%', width:'100%'}}>
                        {renderPasskeys(savedCredentials)}
                    </Accordion>
                </div>
            </>
        )
    }
}
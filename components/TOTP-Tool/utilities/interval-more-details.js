import { arrayBufferToBase64 } from '../../WebAuthn-Tool/utilities/base64';

import { RenderBits, RenderBytes } from './byte-bit-rendering';

import Accordion from 'react-bootstrap/Accordion';

export function RenderIntervalMoreDetails(item) {
    return (
        <>
            <div>

                <h4>Part 1: Calculate Hop Count</h4>
                <p>Calculate the number of 30 second intervals (hops) since <b>Epoch Time</b> (midnight Jan 1, 1970 UTC) to <b>{item.name}</b>.</p>
                
                <span><b>Time ({item.name}):</b> {item.strTime}</span><br/>

                <span><b>Time since Epoch:</b> {(item.epochTime / 1000)} seconds</span><br/>

                <b>Hop Count</b> = Time Since Epoch / 30 seconds <br/> 
                            = {(item.epochTime / 1000)} seconds / 30 seconds <br/>
                            = {item.hopCount}
                <br/>
                <br/>
                <h4>Part 2: HMAC-SHA1 Hash</h4>
                <p>Calculate the HMAC-SHA1 hash of the <b>Hop Count</b> using the <b>Secret Key</b>.</p>
                <b>Hop Count: </b> {item.hopCount}<br/>
                <b>Secret Key: </b> {item.secretKey}<br/>
                <br/>
                <b>HMAC-SHA1 Hash (Base64):</b> HMAC-SHA1(Secret Key, Hop Count) <br/>
                = {arrayBufferToBase64(item.hmacSig)} <br/>
                <br/>
                {RenderBytes(item.hmacSig)}
                <br/>
                <h4>Part 3: Calculate Offset</h4>
                <p>Offset is the <b>last 4 bits of the above HMAC-SHA1 hash.</b></p>
                <b>Last Byte of HMAC-SHA1:</b> {item.lastByte}   {RenderBits(item.lastByte)}
                <br/>
                <b>Offset:</b> Extract last 4 bits of last byte<br/>
                = Last Byte & 0x0F<br/> 
                = {item.lastByte} & 0x0F<br/> 
                = {item.offset}       <br/>
                {RenderBits(item.offset)}
                <br/>
                <br/>

                <h4>Part 4: Truncated Hash</h4>
                <p>Truncated Hash is a 4 byte extraction of the HMAC-SHA1 hash starting from the Offset index.</p>

                Full HMAC-SHA1 Hash (Byte Array):
                {RenderBytes(item.hmacSig)}
                <br/>
                Truncated Hash = SHA1-Hash[Offset: (Offset + 4)] <br/>
                                = SHA1-Hash[{item.offset} : ({item.offset} + 4)] <br/>
                                = SHA1-Hash[{item.offset} : {item.offset + 4}] <br/>
                                {RenderBytes(item.truncatedBytes)}
                <br/>
                <br/>
                <h4>Part 5: Long TOTP Code</h4>
                <p>Long TOTP code calculated by representing the <b>4-byte Truncated Hash</b> as a single <b>Unsigned 32-bit Integer</b>.</p>
                {RenderBytes(item.truncatedBytes)}

                <b>Long TOTP Code:</b> {item.longTOTPCode}<br/>

                <br/>
                <br/>

                <h4>Part 6: Short TOTP Code</h4>
                <p>Extract only the last 6 digits for standard TOTP authenticator format.</p>

                <b>Short TOTP Code:</b> {item.shortTOTPCodeFormatted} <br/>
            </div>
        </>
    )
}

export function RenderIntervals(TOTPList) {
    return (
        TOTPList.map((item) => (
            <>
                <Accordion.Item class="interval-item" id={"interval-id" + item.id} eventKey={item.id}>
                    <Accordion.Header><div style={{display: 'flex', flexDirection: 'row', gap: '15px'}}><div style={{border: '1px solid #000', borderRadius: '5px', width: '75px', paddingLeft: 'auto', paddingRight: 'auto'}}><i class="bi bi-clock"></i> {item.name}</div><div><b>{item.shortTOTPCodeFormatted.slice(0, 3)} {item.shortTOTPCodeFormatted.slice(3, 6)}</b></div></div></Accordion.Header>
                    <Accordion.Body>
                        {RenderIntervalMoreDetails(item)}
                    </Accordion.Body>
                </Accordion.Item>
            </>
        ))
    )
}
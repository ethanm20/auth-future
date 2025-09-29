import {Button, Container, Modal} from 'react-bootstrap';

import Accordion from 'react-bootstrap/Accordion';

import { GenerateBase32SecretKey } from './utilities/generate-base-32-key';
import { useState, useEffect, useRef } from 'react';

import { fixBase32Padding, encodeLongLongInt } from './utilities/base32-utilities';

import { arrayBufferToBase64 } from '../WebAuthn-Tool/utilities/base64';

import { hmacSha1 } from './utilities/hmac-sha1';

import { RenderIntervalMoreDetails, RenderIntervals } from './utilities/interval-more-details';



//const base32Decode = require('base32-decode')
import * as base32Decode from 'base32-decode';
import * as QRCode from 'qrcode';


export default function TOTPTool() {
    const [secretKeyValue, setSecretKey] = useState(GenerateBase32SecretKey());

    const [QRImgValue, setQRImgValue] = useState('bbb');

    const [QRTextValue, setQRTextValue] = useState('bbb');

    const [currTimeValue, setCurrTimeValue] = useState(new Date())

    const [currTimeStr, setCurrTimeStr] = useState(currTimeValue.toUTCString())

    const [currTimeEpoch, setCurrTimeEpoch] = useState(new Date().toUTCString())

    const [openIntervalTabNo, setOpenIntervalTabNo] = useState(-1)

    const [providerName, setProviderName] = useState('AuthFuture')

    const [QRUsername, setQRUsername] = useState('random@random.com')

    const [QRDetailsModalShow, setQRDetailsModalShow] = useState(false);

    const [showTOTPErrorBox, setShowTOTPErrorBox] = useState(false)

    const [tempSecretKey, setTempSecretKey] = useState(secretKeyValue)

    const secretKeyRef = useRef(secretKeyValue);

    const [TOTPList, setTOTPList] = useState([])


    useEffect(() => {
        secretKeyRef.current = secretKeyValue
        updateTOTPCalculation()
    }, [])

    //Updates both QR Image and Text
    function updateQRTextImage() {
        let qrCodeLabel = 'AuthFuture';
        let qrCodeEmail = "username";
        let qrCodeSecret = secretKeyValue;  
        let qrCodeDigits = 6;
        let qrCodePeriod = 30;
        let qrCodeStr = 'otpauth://totp/' + providerName + ':' + QRUsername + '?secret=' + qrCodeSecret + '&issuer=' + qrCodeLabel + '&digits=' + qrCodeDigits + '&period=' + qrCodePeriod;
        
        setQRTextValue(qrCodeStr)

        //const QRCode = require('qrcode');

        QRCode.toDataURL(qrCodeStr, {
                errorCorrectionLevel: 'H',
                type: 'image/png'
            },
            function(err, url) {
                if (err) throw err;
                setQRImgValue(url);
            }
        );
    }

    useEffect(() => {
        secretKeyRef.current = secretKeyValue
        updateQRTextImage();
        updateTOTPCalculation();
    }, [secretKeyValue, QRUsername, providerName])
    
    function clickGenerateSecretKey() {
        const randomKey = GenerateBase32SecretKey()

        setSecretKey(randomKey)

        setShowTOTPErrorBox(false)
        setTempSecretKey(randomKey)

    }


    function handleNewKey(key) {
        console.log('-------------------------ERROR----------------')
        setTempSecretKey(key)
        console.log('RAN6')
        console.log(key)
        try {

            const decodedArray = base32Decode(fixBase32Padding(key), 'RFC4648')

            if (decodedArray.byteLength !== 0) {
                setShowTOTPErrorBox(false)
                setSecretKey(key)
            } else {
                setShowTOTPErrorBox(true)
                return
            }
        } catch (error) {

            setShowTOTPErrorBox(true)
            return
        }

        
    }
    //-------------------------------------------------------------------------
    //INTERVAL 
    
    // Executes every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            //secretKeyRef.current = secretKeyValue
            updateTOTPCalculation();
        }, 30000);
      
        return () => clearInterval(interval);
      }, []);
    
    

    

    

    


    async function updateTOTPCalculation() {
        //Update global time
        const timeEpoch = Date.now()
        setCurrTimeEpoch(new Date(timeEpoch).toUTCString());

        let TOTPListNew = []

        const TOTPTimeOffsets = [-90, -60, -30, 0, 30, 60, 90]

        for (let idx=0; idx <= 6; idx++) {
            const item = TOTPTimeOffsets[idx]

            let name = ""
            if (TOTPTimeOffsets[idx] < 0) {
                name = 'T' + parseInt(item) + 's'
            } else if (TOTPTimeOffsets[idx] > 0) {
                name = 'T+' + parseInt(item) + 's'
            } else {
                name = 'Now'
            }
            //Step 0 Initialisation
            TOTPListNew.push({
                'id': idx,
                'name': name,
                'timeOffset': item,
                'epochTime': timeEpoch + (item * 1000),
                'strTime': '',
                'hopCount': 0,
                'hmacSig': null,
                'offset': null,
                'lastByte': null,
                'asciiHash': null,
                'truncatedHashAscii': null,
                'truncatedByte1': null,
                'truncatedByte2': null,
                'truncatedByte3': null,
                'truncatedByte4': null,
                'truncatedHash': null,
                'truncatedBytes': null,
                'longTOTPCode': null,
                'shortTOTPCode': 111111,
                'shortTOTPCodeFormatted': "111111",
                "secretKey": secretKeyValue
            })

            //Step 1 & Step 2: Update Time for Item
            TOTPListNew[idx].strTime = new Date(TOTPListNew[idx].epochTime).toUTCString()

            //Step 3: Update Hop Count
            TOTPListNew[idx].hopCount = parseInt((TOTPListNew[idx].epochTime / 1000) / 30)

            //Step 4: Encode hop count as long long int
            


            //Step 5: HMAC Hash    
            
            TOTPListNew[idx].hmacSig = await hmacSha1(secretKeyRef.current, TOTPListNew[idx].hopCount)

            //const asciiHash = atob(arrayBufferToBase64(hmacSig));
            TOTPListNew[idx].asciiHash = atob(arrayBufferToBase64(TOTPListNew[idx].hmacSig));

            // Get last character (each char = 1 byte)
            //const lastByte = asciiHash[asciiHash.length - 1].charCodeAt(0);
            TOTPListNew[idx].lastByte = TOTPListNew[idx].asciiHash[TOTPListNew[idx].asciiHash.length - 1].charCodeAt(0);

            // Convert char to byte value (0–255)
            console.log('LastByte')
            console.log(TOTPListNew[idx].lastByte)

            //const offset = lastByte & 0x0F
            TOTPListNew[idx].offset = TOTPListNew[idx].lastByte & 0x0F

            console.log('Offset')
            console.log(TOTPListNew[idx].offset)

            TOTPListNew[idx].truncatedHash = TOTPListNew[idx].hmacSig.slice(TOTPListNew[idx].offset, (TOTPListNew[idx].offset + 4))

            console.log('Truncated Hash')
            console.log(TOTPListNew[idx].truncatedHash)


            //Long Code

            TOTPListNew[idx].truncatedBytes = new Uint8Array(TOTPListNew[idx].truncatedHash)

            console.log('Truncated Bytes')
            console.log(TOTPListNew[idx].truncatedBytes)

            const dataView = new DataView(TOTPListNew[idx].truncatedBytes.buffer, TOTPListNew[idx].truncatedBytes.byteOffset, TOTPListNew[idx].truncatedBytes.byteLength);
            let code = dataView.getUint32(0, false); 
            TOTPListNew[idx].longTOTPCode = code & 0x7FFFFFFF;

            console.log('Long Code')
            console.log(TOTPListNew[idx].longTOTPCode)

            TOTPListNew[idx].shortTOTPCode  = TOTPListNew[idx].longTOTPCode % (10 ** 6)

            console.log('Short Code')
            console.log(TOTPListNew[idx].shortTOTPCode )


            TOTPListNew[idx].shortTOTPCodeFormatted = String(TOTPListNew[idx].shortTOTPCode).padStart(6, '0');
        
        }
        
        
        setTOTPList(TOTPListNew)

    }

    

    function QRCodeModal() {
        return (
            <>
                <Modal show={QRDetailsModalShow} onHide={(event) => {setQRDetailsModalShow(false)}}>
                    <Modal.Header closeButton>
                    <Modal.Title>QR Code Content</Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{textWrap: 'wrap', textWrapStyle: 'pretty', overflowWrap:'break-word'}}><div><p>{QRTextValue}</p></div></Modal.Body>
                </Modal>
            </>
        )
    }

    //-------------------------------------------------------------------------
    // RENDERING SECTION

    return (
        <>
            <section style={{backgroundColor: '#2a2a2a', paddingTop:'20px', paddingBottom: '20px'}} className="text-white" id="totp-section">
                <Container>
                    <link rel="stylesheet" href="/css/totp-tool.css"></link>
                    <h2>Time-Based One Time Passwords</h2>
                
                    <div id="totp-tool-container">
                        <div id="generating-qr-code" style={{paddingTop: '10px', paddingBottom: '30px'}}>
                            <h3><i class="bi bi-sliders"></i> Configuration</h3>

                            

                            <div id="otp-secret" style={{gap: '20px'}}>
                                <div id="qr-code">
                                    <div id="otp-qr-code">
                                        <img src={QRImgValue} width="100%" height="100%"></img>
                                    </div>
                                    <div style={{textAlign: 'center', paddingTop: '5px'}}>
                                        <Button variant="outline-light" onClick={(event) => {setQRDetailsModalShow(true)}}><i class="bi bi-plus"></i>QR Code Content</Button>
                                    </div>
                                    {QRCodeModal()}
                                </div>
                                <div id="key-section" style={{width: '100%'}}>
                                    <div className="totp-qr-name section-row py-2">
                                        <label><b>Issuer:</b></label>
                                        <input type="text" className="bg-white text-black" value={providerName} onChange={(event) => {setProviderName(event.target.value)}}></input>
                                    </div>
                                    <div className="totp-qr-username section-row py-2">
                                        <label><b>Username:</b></label>
                                        <input type="text" className="bg-white text-black" value={QRUsername} onChange={(event) => {setQRUsername(event.target.value)}}></input>
                                    </div>
                                    <div className="secret-key-text section-row py-2">
                                        <label><b>Secret Key:</b></label>
                                        <span id="otp-secret-code"><input type="text" className="bg-white text-black" value={tempSecretKey} onChange={(event) => {handleNewKey(event.target.value)}}></input></span>
                                    </div>
                                    {showTOTPErrorBox && (
                                        <div class="alert alert-danger alert-dismissible fade show mt-3 errorBox" role="alert" style={{paddingTop: '0px', paddingBottom: '5px'}}>
                                            <span class="errorMessage" style={{fontSize: '16px'}}><b>Invalid Secret Key: </b> Secret Key must be in Base 32 format</span>
                                        </div>
                                    )}
                                    <div id="key-update-buttons">
                                        <Button variant="light" onClick={clickGenerateSecretKey}><i class="bi bi-arrow-repeat"></i> Generate</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div id="totp-calculator">
                            <h3>Valid Codes</h3>
                            <div>
                                <div>
                                    <span><i class="bi bi-clock"></i> {currTimeEpoch} (UTC)</span>
                                </div>
                                <div>
                                    <Accordion>
                                        {RenderIntervals(TOTPList)}
                                    </Accordion>
                                </div>
                            </div>

                        </div>
                    </div>
                </Container>
            </section>
        </>
    )
}

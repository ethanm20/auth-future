import { arrayBufferToBase64 } from "./base64";

export function concatArrayBuffers(buffer1, buffer2) {
    const totalLength = buffer1.byteLength + buffer2.byteLength;
    const result = new Uint8Array(totalLength);
    result.set(new Uint8Array(buffer1), 0);
    result.set(new Uint8Array(buffer2), buffer1.byteLength);
    return arrayBufferToBase64(result.buffer);
}
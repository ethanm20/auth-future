export function RenderBits(number) {
        const binaryString = number.toString(2).padStart(8, '0');
        const bits = binaryString.split('');

        return (
            <div style={{ display: 'flex', gap: '2px' }}>
            {bits.map((bit, index) => (
                <div
                key={index}
                style={{
                    border: '1px solid black',
                    padding: '0px',
                    width: '20px',
                    textAlign: 'center',
                    fontFamily: 'monospace'
                }}
                >
                {bit}
                </div>
            ))}
            </div>
        );

}

export function RenderBytes(byteUint8Array) {
    const byteArray = Array.from(byteUint8Array)

    return (
        <div className="bytesTable" style={{ display: 'flex', gap: '2px' }}>
        {byteArray.map((bit, index) => (
            <div
            key={index}
            style={{
                border: '1px solid black',
                padding: '0px',
                width: '50px',
                textAlign: 'center',
                fontFamily: 'monospace'
            }}
            >
            {bit}
            </div>
        ))}
        </div>
    );

}
import { FeatureImage, WebAuthnTool} from "@/components"

import dynamic from 'next/dynamic';

const TOTPTool = dynamic(() => import('@/components/TOTP-Tool/TOTP-Tool'), { ssr: false });

export default function Home() {
    return (
        <>
            <FeatureImage/>
            <WebAuthnTool/>
            <TOTPTool/>  
        </>
    )
    /*return (
        <>
            <div>
                <FeatureImage/>
            </div>
            <div>
                <WebAuthnTool/>
            </div>
            <div>
                <TOTPTool/>
            </div>
        </>
    )*/
}
import ReactFlow, { ReactFlowProvider, Handle, Position }  from 'reactflow';

import {Button, Container, Modal, ButtonGroup} from 'react-bootstrap';

import { useState, useRef, useEffect } from 'react';




const CustomNode = ({ data }) => {
    const handles = Array.isArray(data?.handles) ? data.handles : [];

    return (
        <div style={{ border: '0px solid ' + data.bgColor, borderRadius: '12px', width: '200px', height: data.height ? data.height : '100px', zIndex: 10, position: 'relative'}}>
            {handles.map((handle, index) => (
                <Handle
                key={index}
                type={handle.type}           // 'source' or 'target'
                position={handle.position}   // e.g. Position.Top, Position.Bottom
                id={handle.id}               // optional but useful for complex graphs
                style={handle.style || {}}
                />
            ))}
            <div style={{paddingLeft: 'auto', paddingRight: 'auto', opacity: 1, border: '3px solid rgb(155, 89, 182)', borderRadius: '10px', width: '100%', height: '100%'}}>
                <div id="node-label">
                    <span style={{fontSize: '14px', color: '#FFF'}}><i class={data.icon ? data.icon : ''}></i> {data.label}</span>
                </div>
            </div>
        </div>
    );
};

const PlatformNode = ({ data }) => {
    return (
        <div style={{ padding: 10, border: '1px solid rgb(17, 17, 17)', borderRadius: 5, color: '#FFF', background: 'rgb(17, 17, 17)', width: '1200px', height: '200px', zIndex: -1, position: 'relative' }}>
            <div>
                <span style={{fontSize: '20px'}}><i class={data.icon}></i> {data.platformName}</span>
            </div>
        </div>
    );
};

export function PasskeyExplanation() {
    const [passkeyDiagramTab, setPasskeyDiagramTab] = useState(0)

    function passkeyDiagram() {
        
        const nodeTypes = {
            custom: CustomNode,
            platform: PlatformNode
        }

        const registrationNodes = [
        {
            id: '0',
            type: 'platform',
            position: { x: 0, y: 0 },
            data: { platformName: 'Server', icon: 'bi bi-hdd-stack-fill' },
            sourcePosition: 'right',
            targetPosition: 'left'
        },
        {
            id: '1',
            type: 'platform',
            position: { x: 0, y: 250 },
            data: { platformName: 'Browser', icon: 'bi bi-person-fill' },
            sourcePosition: 'right',
            targetPosition: 'left'
        },
        {
            id: '2',
            type: 'platform',
            position: { x: 0, y: 500 },
            data: { platformName: 'Authenticator', icon: 'bi bi-shield-fill-check' },
            sourcePosition: 'right',
            targetPosition: 'left'
        },
        {
            id: '3',
            type: 'custom',
            position: { x: 175, y: 50 },
            data: { id: '3', label: 'Credential Creation Options for Browser', icon: 'bi bi-1-circle', bgColor: 'rgb(155, 89, 182)',
                handles: [
                { type: 'target', position: Position.Left, id: 'input1' },
                { type: 'source', position: Position.Bottom, id: 'output1' }
                ]
                },
            sourcePosition: 'right',
            targetPosition: 'left',
            
        },
        {
            id: '4',
            type: 'custom',
            position: { x: 500, y: 300 },
            data: { label: 'Browser calls navigator.credentials.create()', icon: 'bi bi-2-circle', bgColor: 'rgb(155, 89, 182)',
                handles: [
                { type: 'target', position: Position.Left, id: 'input1' },
                { type: 'source', position: Position.Right, id: 'output1' },
                { type: 'source', position: Position.Bottom, id: 'output2' },
                { type: 'target', position: Position.Bottom, id: 'input2' },
                ]
                },
            sourcePosition: 'right',
            targetPosition: 'left'
        },
        {
            id: '5',
            type: 'custom',
            position: { x: 500, y: 550 },
            data: { label: 'Create Key Pair', icon: 'bi bi-3-circle',
                handles: [
                { type: 'target', position: Position.Top, id: 'input1' },
                { type: 'source', position: Position.Left, id: 'output1' }
                ]
                },
            sourcePosition: 'up',
            targetPosition: 'top'
        },
        {
            id: '6',
            type: 'custom',
            position: { x: 975, y: 50 },
            data: { label: 'Store Public Key', icon: 'bi bi-4-circle',
                handles: [
                { type: 'target', position: Position.Bottom, id: 'input1' },
                { type: 'source', position: Position.Right, id: 'output1' }
                ]
                },
            sourcePosition: 'right',
            targetPosition: 'left'
        }
        ];

        const registrationEdges = [
        { id: 'e1-2', source: '3', target: '4', type: 'straight', markerEnd: {type: 'arrowclosed'}, style: { strokeWidth: 3, stroke: '#808080', zIndex: 10, borderWidth: '3px'}},
        { id: 'e2-3', source: '4', target: '5', type: 'straight', sourceHandle: 'output2',  markerStart: {type: 'arrowclosed'}, markerEnd: {type: 'arrowclosed'}, style: { strokeWidth: 3, stroke: '#808080', zIndex: 10 }},
        { id: 'e3-4', source: '4', target: '6', type: 'straight', markerEnd: {type: 'arrowclosed'}, style: { strokeWidth: 3, stroke: '#808080', zIndex: 10 } }
        ];

        const verificationNodes = [
        {
            id: '0',
            type: 'platform',
            position: { x: 0, y: 0 },
            data: { platformName: 'Server', icon: 'bi bi-hdd-stack-fill' },
            sourcePosition: 'right',
            targetPosition: 'left'
        },
        {
            id: '1',
            type: 'platform',
            position: { x: 0, y: 250 },
            data: { platformName: 'Browser', icon: 'bi bi-person-fill' },
            sourcePosition: 'right',
            targetPosition: 'left'
        },
        {
            id: '2',
            type: 'platform',
            position: { x: 0, y: 500 },
            data: { platformName: 'Authenticator', icon: 'bi bi-shield-fill-check' },
            sourcePosition: 'right',
            targetPosition: 'left'
        },
        {
            id: '3',
            type: 'custom',
            position: { x: 175, y: 30 },
            data: { label: 'Server Generates Credential Verification Options', icon: 'bi bi-1-circle',
                height: '140px',
                handles: [
                { type: 'target', position: Position.Left, id: 'input1' },
                { type: 'source', position: Position.Bottom, id: 'output1' }
                ]
                },
            sourcePosition: 'right',
            targetPosition: 'left'
        },
        {
            id: '4',
            type: 'custom',
            position: { x: 500, y: 300 },
            data: { label: 'Browser Calls navigator.credentials.get()', icon: 'bi bi-2-circle',
                handles: [
                { type: 'target', position: Position.Left, id: 'input1' },
                { type: 'source', position: Position.Right, id: 'output1' },
                { type: 'source', position: Position.Bottom, id: 'output2' },
                ]
                },
            sourcePosition: 'right',
            targetPosition: 'left'
        },
        {
            id: '5',
            type: 'custom',
            position: { x: 500, y: 550 },
            data: { label: 'Local Authenticator Returns Assertion Signature', icon: 'bi bi-3-circle',
                handles: [
                { type: 'target', position: Position.Top, id: 'input1' },
                { type: 'source', position: Position.Left, id: 'output1' }
                ]
                },
            sourcePosition: 'right',
            targetPosition: 'left'
        },
        {
            id: '6',
            type: 'custom',
            position: { x: 750, y: 300 },
            data: { label: 'Send Assertion Response to Server', icon: 'bi bi-4-circle',
                handles: [
                { type: 'target', position: Position.Left, id: 'input1' },
                { type: 'source', position: Position.Right, id: 'output1' }
                ]
                },
            sourcePosition: 'right',
            targetPosition: 'left'
        },
        {
            id: '7',
            type: 'custom',
            position: { x: 975, y: 30 },
            data: { label: 'Validate Assertion Signature with Stored Public Key', icon: 'bi bi-5-circle',
                height: '140px',
                handles: [
                { type: 'target', position: Position.Bottom, id: 'input1' },
                { type: 'source', position: Position.Right, id: 'output1' }
                ]
                },
            sourcePosition: 'right',
            targetPosition: 'left'
        }
        ];

        const verificationEdges = [
        { id: 'e1-2', source: '1', target: '2', type: 'straight', markerEnd: {type: 'arrowclosed'}, style: { strokeWidth: 3, stroke: '#808080', zIndex: 10 }},
        { id: 'e2-3', source: '2', target: '3', type: 'straight', markerEnd: {type: 'arrowclosed'}, style: { strokeWidth: 3, stroke: '#808080', zIndex: 10 } },
        { id: 'e3-4', source: '3', target: '4', type: 'straight', markerEnd: {type: 'arrowclosed'}, style: { strokeWidth: 3, stroke: '#808080', zIndex: 10 } },
        { id: 'e4-5', source: '4', target: '5', sourceHandle: 'output2', type: 'straight', markerStart: {type: 'arrowclosed'}, markerEnd: {type: 'arrowclosed'}, style: { strokeWidth: 3, stroke: '#808080', zIndex: 10 } },
        { id: 'e4-6', source: '4', target: '6', type: 'straight', markerEnd: {type: 'arrowclosed'}, style: { strokeWidth: 3, stroke: '#808080', zIndex: 10 } },
        { id: 'e6-7', source: '6', target: '7', type: 'straight', markerEnd: {type: 'arrowclosed'}, style: { strokeWidth: 3, stroke: '#808080', zIndex: 10 } },
        ];

        if (passkeyDiagramTab == 0) {
            //Assertion (Registration)
            return (
                <>
                    <ReactFlowProvider>
                        <div style={{width: '100%', height: '750px'}}>
                            <ReactFlow colorMode="dark" nodes={registrationNodes} edges={registrationEdges} nodeTypes={nodeTypes}
                            fitView
                            zoomOnScroll={false}
                            zoomOnPinch={false}
                            panOnScroll={false}
                            panOnDrag={false}
                            nodesDraggable={false}
                            nodesConnectable={false}
                            elementsSelectable={false}
                            preventScrolling={false} 
                            panOnScrollMode={null}/>
                        </div>
                    </ReactFlowProvider>
                </>
            )
        } else {
            //Assertation (Verification)
            return (
                <>
                    <ReactFlowProvider>
                        <div style={{width: '100%', height: '750px'}}>
                            <ReactFlow nodes={verificationNodes} edges={verificationEdges} nodeTypes={nodeTypes} 
                            fitView
                            zoomOnScroll={false}
                            zoomOnPinch={false}
                            panOnScroll={false}
                            panOnDrag={false}
                            nodesDraggable={false}
                            nodesConnectable={false}
                            elementsSelectable={false}
                            preventScrolling={false} 
                            panOnScrollMode={null}
                            />
                        </div>
                    </ReactFlowProvider>
                </>
            )
        }
    }
    
    return (
        <>
            <div style={{display: 'flex', flexDirection: 'column'}}>
                <div>
                    <p>Passkeys enable users to securely login to web apps using a local authenticator either as MFA or instead of a password.</p>
                </div>
                <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', width: '100%'}}> 
                    <ButtonGroup aria-label="Basic example">
                        <Button variant={passkeyDiagramTab == 0 ? 'dark' : 'outline-dark'} onClick={(event) => {setPasskeyDiagramTab(0)}}>Passkey Registration (Assertation)</Button>
                        <Button variant={passkeyDiagramTab == 1 ? 'dark' : 'outline-dark'}  onClick={(event) => {setPasskeyDiagramTab(1)}}>Passkey Verification (Assertion)</Button>
                    </ButtonGroup>
                </div>
                <div style={{width: '100%'}}>
                    {passkeyDiagram()}
                </div>
            </div>
        </>
    )
}



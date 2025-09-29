(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect(param) {
    let { addMessageListener, sendMessage, onUpdateError = console.error } = param;
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: (param)=>{
            let [chunkPath, callback] = param;
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        var _updateA_modules;
        const deletedModules = new Set((_updateA_modules = updateA.modules) !== null && _updateA_modules !== void 0 ? _updateA_modules : []);
        var _updateB_modules;
        const addedModules = new Set((_updateB_modules = updateB.modules) !== null && _updateB_modules !== void 0 ? _updateB_modules : []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        var _updateA_added, _updateB_added;
        const added = new Set([
            ...(_updateA_added = updateA.added) !== null && _updateA_added !== void 0 ? _updateA_added : [],
            ...(_updateB_added = updateB.added) !== null && _updateB_added !== void 0 ? _updateB_added : []
        ]);
        var _updateA_deleted, _updateB_deleted;
        const deleted = new Set([
            ...(_updateA_deleted = updateA.deleted) !== null && _updateA_deleted !== void 0 ? _updateA_deleted : [],
            ...(_updateB_deleted = updateB.deleted) !== null && _updateB_deleted !== void 0 ? _updateB_deleted : []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        var _updateA_modules1, _updateB_added1;
        const modules = new Set([
            ...(_updateA_modules1 = updateA.modules) !== null && _updateA_modules1 !== void 0 ? _updateA_modules1 : [],
            ...(_updateB_added1 = updateB.added) !== null && _updateB_added1 !== void 0 ? _updateB_added1 : []
        ]);
        var _updateB_deleted1;
        for (const moduleId of (_updateB_deleted1 = updateB.deleted) !== null && _updateB_deleted1 !== void 0 ? _updateB_deleted1 : []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        var _updateB_modules1;
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set((_updateB_modules1 = updateB.modules) !== null && _updateB_modules1 !== void 0 ? _updateB_modules1 : []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error("Invariant: ".concat(message));
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/components/FeatureImage/FeatureImage.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Container$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Container$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Container.js [client] (ecmascript) <export default as Container>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Row$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Row$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Row.js [client] (ecmascript) <export default as Row>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Col$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Col$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Col.js [client] (ecmascript) <export default as Col>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Button.js [client] (ecmascript) <export default as Button>");
;
;
const FeatureImage = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "feature-image",
            style: {
                width: '100%',
                padding: 0,
                backgroundColor: '#111111'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Container$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Container$3e$__["Container"], {
                style: {},
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Row$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Row$3e$__["Row"], {
                    className: "align-items-center",
                    style: {
                        height: '80vh'
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Col$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Col$3e$__["Col"], {
                        md: 6,
                        className: "text-white",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                style: {
                                    fontSize: '60px',
                                    fontWeight: '700'
                                },
                                children: [
                                    "Learn about the ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        style: {
                                            color: '#9b59b6'
                                        },
                                        children: "future"
                                    }, void 0, false, {
                                        fileName: "[project]/components/FeatureImage/FeatureImage.js",
                                        lineNumber: 10,
                                        columnNumber: 95
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    " of authentication."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/FeatureImage/FeatureImage.js",
                                lineNumber: 10,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Row$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Row$3e$__["Row"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Col$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Col$3e$__["Col"], {
                                        md: 5,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                            variant: "light",
                                            size: "lg",
                                            href: "#webauthn-section",
                                            className: "cta-button",
                                            children: [
                                                "WebAuthn Passkeys ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                    className: "bi bi-arrow-right"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/FeatureImage/FeatureImage.js",
                                                    lineNumber: 15,
                                                    columnNumber: 59
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/FeatureImage/FeatureImage.js",
                                            lineNumber: 14,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/components/FeatureImage/FeatureImage.js",
                                        lineNumber: 13,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Col$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Col$3e$__["Col"], {
                                        md: 7,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                            variant: "outline-light",
                                            size: "lg",
                                            href: "#totp-section",
                                            className: "cta-button",
                                            children: [
                                                "Time-Based One Time Passwords ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                    class: "bi bi-arrow-right"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/FeatureImage/FeatureImage.js",
                                                    lineNumber: 20,
                                                    columnNumber: 71
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/FeatureImage/FeatureImage.js",
                                            lineNumber: 19,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/components/FeatureImage/FeatureImage.js",
                                        lineNumber: 18,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/FeatureImage/FeatureImage.js",
                                lineNumber: 12,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/FeatureImage/FeatureImage.js",
                        lineNumber: 9,
                        columnNumber: 25
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/components/FeatureImage/FeatureImage.js",
                    lineNumber: 8,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/components/FeatureImage/FeatureImage.js",
                lineNumber: 7,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/components/FeatureImage/FeatureImage.js",
            lineNumber: 6,
            columnNumber: 13
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false);
};
_c = FeatureImage;
const __TURBOPACK__default__export__ = FeatureImage;
var _c;
__turbopack_context__.k.register(_c, "FeatureImage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/Footer/Footer.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Footer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Container$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Container$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Container.js [client] (ecmascript) <export default as Container>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Row$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Row$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Row.js [client] (ecmascript) <export default as Row>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Col$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Col$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Col.js [client] (ecmascript) <export default as Col>");
;
;
function Footer() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            id: "footer-container",
            style: {
                color: '#FFF',
                backgroundColor: '#111111',
                maxWidth: '100%'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Container$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Container$3e$__["Container"], {
                style: {
                    maxWidth: '100%'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Row$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Row$3e$__["Row"], {
                        style: {
                            height: '10vh'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Col$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Col$3e$__["Col"], {
                                md: 6,
                                style: {
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    fontSize: '24px'
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Row$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Row$3e$__["Row"], {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "AuthFuture"
                                    }, void 0, false, {
                                        fileName: "[project]/components/Footer/Footer.js",
                                        lineNumber: 13,
                                        columnNumber: 25
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/Footer/Footer.js",
                                    lineNumber: 12,
                                    columnNumber: 21
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/Footer/Footer.js",
                                lineNumber: 11,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Col$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Col$3e$__["Col"], {
                                md: 6,
                                style: {
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Row$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Row$3e$__["Row"], {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Col$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Col$3e$__["Col"], {
                                        md: 12,
                                        style: {
                                            display: 'flex',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            gap: '5px',
                                            fontSize: '20px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "https://linkedin.com/in/ethan-marlow",
                                                target: "_blank",
                                                style: {
                                                    color: '#FFF'
                                                },
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                    class: "bi bi-linkedin"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/Footer/Footer.js",
                                                    lineNumber: 21,
                                                    columnNumber: 33
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/Footer/Footer.js",
                                                lineNumber: 20,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "https://github.com/ethanm20",
                                                target: "_blank",
                                                style: {
                                                    color: '#FFF'
                                                },
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                    class: "bi bi-github"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/Footer/Footer.js",
                                                    lineNumber: 24,
                                                    columnNumber: 33
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/Footer/Footer.js",
                                                lineNumber: 23,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/Footer/Footer.js",
                                        lineNumber: 19,
                                        columnNumber: 25
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/Footer/Footer.js",
                                    lineNumber: 18,
                                    columnNumber: 21
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/Footer/Footer.js",
                                lineNumber: 17,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/Footer/Footer.js",
                        lineNumber: 10,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Row$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Row$3e$__["Row"], {
                        style: {
                            borderTop: '1px solid #f9f9f9'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Col$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Col$3e$__["Col"], {
                            md: 12,
                            style: {
                                textAlign: 'center'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    "© 2025 ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: "Ethan Marlow"
                                    }, void 0, false, {
                                        fileName: "[project]/components/Footer/Footer.js",
                                        lineNumber: 32,
                                        columnNumber: 39
                                    }, this),
                                    "     All rights reserved."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/Footer/Footer.js",
                                lineNumber: 32,
                                columnNumber: 21
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/Footer/Footer.js",
                            lineNumber: 31,
                            columnNumber: 17
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/Footer/Footer.js",
                        lineNumber: 30,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/Footer/Footer.js",
                lineNumber: 9,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/Footer/Footer.js",
            lineNumber: 8,
            columnNumber: 5
        }, this)
    }, void 0, false);
}
_c = Footer;
var _c;
__turbopack_context__.k.register(_c, "Footer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/NavigationBar/NavigationBar.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

//import Container from 'react-bootstrap/Container';
__turbopack_context__.s([
    "default",
    ()=>NavigationBar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Nav$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Nav.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Navbar$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Navbar.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Container$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Container$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Container.js [client] (ecmascript) <export default as Container>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Button.js [client] (ecmascript) <export default as Button>");
;
;
;
;
;
function NavigationBar() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Navbar$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
            variant: "dark",
            sticky: "top",
            expand: "lg",
            width: "100%",
            style: {
                top: '0px',
                zIndex: '30',
                marginTop: ' -49px',
                height: '50px',
                backgroundColor: '#111111'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Container$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Container$3e$__["Container"], {
                style: {
                    height: '50px',
                    display: 'flex',
                    flexDirection: 'row'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Navbar$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].Brand, {
                        href: "/",
                        style: {
                            display: 'flex',
                            width: '105px'
                        },
                        children: "AuthFuture"
                    }, void 0, false, {
                        fileName: "[project]/components/NavigationBar/NavigationBar.js",
                        lineNumber: 13,
                        columnNumber: 15
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Nav$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        className: "me-auto",
                        style: {
                            justifyContent: 'end',
                            flexDirection: 'row',
                            display: 'flex',
                            width: 'calc(100% - 150px)'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Nav$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].Item, {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Nav$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].Link, {
                                    href: "https://github.com/ethanm20/AuthFuture",
                                    target: "_blank",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                        variant: "outline-light",
                                        style: {
                                            borderRadius: '25px'
                                        },
                                        className: "github-header-outer",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                class: "bi bi-github"
                                            }, void 0, false, {
                                                fileName: "[project]/components/NavigationBar/NavigationBar.js",
                                                lineNumber: 18,
                                                columnNumber: 25
                                            }, this),
                                            " ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "github-text",
                                                children: "Source Code"
                                            }, void 0, false, {
                                                fileName: "[project]/components/NavigationBar/NavigationBar.js",
                                                lineNumber: 18,
                                                columnNumber: 54
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/NavigationBar/NavigationBar.js",
                                        lineNumber: 17,
                                        columnNumber: 23
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/NavigationBar/NavigationBar.js",
                                    lineNumber: 16,
                                    columnNumber: 21
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/NavigationBar/NavigationBar.js",
                                lineNumber: 15,
                                columnNumber: 19
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Nav$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].Item, {
                                style: {
                                    display: 'none'
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Nav$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].Link, {
                                    href: "https://www.linkedin.com/in/ethan-marlow",
                                    target: "_blank",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                        class: "bi bi-moon"
                                    }, void 0, false, {
                                        fileName: "[project]/components/NavigationBar/NavigationBar.js",
                                        lineNumber: 24,
                                        columnNumber: 23
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/NavigationBar/NavigationBar.js",
                                    lineNumber: 23,
                                    columnNumber: 21
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/NavigationBar/NavigationBar.js",
                                lineNumber: 22,
                                columnNumber: 19
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/NavigationBar/NavigationBar.js",
                        lineNumber: 14,
                        columnNumber: 15
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/NavigationBar/NavigationBar.js",
                lineNumber: 12,
                columnNumber: 13
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/NavigationBar/NavigationBar.js",
            lineNumber: 11,
            columnNumber: 11
        }, this)
    }, void 0, false);
}
_c = NavigationBar;
var _c;
__turbopack_context__.k.register(_c, "NavigationBar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/TOTP-Tool/utilities/generate-base-32-key.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GenerateBase32SecretKey",
    ()=>GenerateBase32SecretKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$randomstring$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/randomstring/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hi$2d$base32$2f$src$2f$base32$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/hi-base32/src/base32.js [client] (ecmascript)");
;
;
function GenerateBase32SecretKey() {
    //var randomstring = require("randomstring");
    const outputStr = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$randomstring$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["generate"]();
    //const base32 = require('hi-base32');
    const encoded = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hi$2d$base32$2f$src$2f$base32$2e$js__$5b$client$5d$__$28$ecmascript$29$__["encode"](outputStr);
    return encoded;
}
_c = GenerateBase32SecretKey;
var _c;
__turbopack_context__.k.register(_c, "GenerateBase32SecretKey");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/TOTP-Tool/utilities/base32-utilities.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "encodeLongLongInt",
    ()=>encodeLongLongInt,
    "fixBase32Padding",
    ()=>fixBase32Padding
]);
//const base32 = require('base32.js');
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$base32$2e$js$2f$base32$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/base32.js/base32.js [client] (ecmascript)");
const Long = __turbopack_context__.r("[project]/node_modules/long/umd/index.js [client] (ecmascript)");
;
function fixBase32Padding(input) {
    const noPadding = input.replace(/=+$/, '');
    const paddingNeeded = (8 - noPadding.length % 8) % 8;
    return noPadding + '='.repeat(paddingNeeded);
}
function encodeLongLongInt(valueStr) {
    const longVal = Long.fromString(valueStr); // Supports large integers
    const bytes = longVal.toBytesBE(); // Big-endian byte array (8 bytes)
    return Uint8Array.from(bytes);
}
function decodeBase32ToArrayBuffer(base32Str) {
    const decoder = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$base32$2e$js$2f$base32$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Decoder"]();
    const uint8Array = decoder.write(base32Str).finalize();
    const newArrayBuffer = new Uint8Array(uint8Array).buffer;
    console.log('UINT8');
    console.log(uint8Array);
    console.log(typeof uint8Array);
    console.log('Buffer');
    console.log(newArrayBuffer);
    // Convert Uint8Array to ArrayBuffer
    return newArrayBuffer;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/WebAuthn-Tool/utilities/base64.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Base64Binary",
    ()=>Base64Binary,
    "GenerateBase64SecretKey",
    ()=>GenerateBase64SecretKey,
    "arrayBufferToBase64",
    ()=>arrayBufferToBase64
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$randomstring$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/randomstring/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hi$2d$base64$2f$src$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/hi-base64/src/base64.js [client] (ecmascript)");
;
;
var Base64Binary = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    /* will return a  Uint8Array type */ decodeArrayBuffer: function(input) {
        var bytes = input.length / 4 * 3;
        var ab = new ArrayBuffer(bytes);
        this.decode(input, ab);
        return ab;
    },
    removePaddingChars: function(input) {
        var lkey = this._keyStr.indexOf(input.charAt(input.length - 1));
        if (lkey == 64) {
            return input.substring(0, input.length - 1);
        }
        return input;
    },
    decode: function(input, arrayBuffer) {
        //get last chars to see if are valid
        input = this.removePaddingChars(input);
        input = this.removePaddingChars(input);
        var bytes = parseInt(input.length / 4 * 3, 10);
        var uarray;
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        var j = 0;
        if (arrayBuffer) uarray = new Uint8Array(arrayBuffer);
        else uarray = new Uint8Array(bytes);
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        for(i = 0; i < bytes; i += 3){
            //get the 3 octects in 4 ascii chars
            enc1 = this._keyStr.indexOf(input.charAt(j++));
            enc2 = this._keyStr.indexOf(input.charAt(j++));
            enc3 = this._keyStr.indexOf(input.charAt(j++));
            enc4 = this._keyStr.indexOf(input.charAt(j++));
            chr1 = enc1 << 2 | enc2 >> 4;
            chr2 = (enc2 & 15) << 4 | enc3 >> 2;
            chr3 = (enc3 & 3) << 6 | enc4;
            uarray[i] = chr1;
            if (enc3 != 64) uarray[i + 1] = chr2;
            if (enc4 != 64) uarray[i + 2] = chr3;
        }
        return uarray;
    }
};
function arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for(var i = 0; i < len; i++){
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
function GenerateBase64SecretKey() {
    //var randomstring = require("randomstring");
    const outputStr = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$randomstring$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["generate"]();
    //const base32 = require('hi-base64');
    let encoded = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hi$2d$base64$2f$src$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["encode"](outputStr, false, 'rfc_4648_url_safe');
    encoded = encoded.replace('=', '');
    return encoded;
}
_c = GenerateBase64SecretKey;
var _c;
__turbopack_context__.k.register(_c, "GenerateBase64SecretKey");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/TOTP-Tool/utilities/hmac-sha1.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "hmacSha1",
    ()=>hmacSha1
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$base32$2d$utilities$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/TOTP-Tool/utilities/base32-utilities.js [client] (ecmascript)");
//const base32Decode = require('base32-decode')
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$base32$2d$decode$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/base32-decode/index.js [client] (ecmascript)");
;
;
async function hmacSha1(key, countInt) {
    const paddedKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$base32$2d$utilities$2e$js__$5b$client$5d$__$28$ecmascript$29$__["fixBase32Padding"])(key);
    const keyRawBytes = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$base32$2d$decode$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__(paddedKey, 'RFC4648');
    // Import the secret key
    const cryptoKey = await crypto.subtle.importKey('raw', keyRawBytes, {
        name: 'HMAC',
        hash: 'SHA-1'
    }, false, [
        'sign'
    ]);
    // Sign the message using the key
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$base32$2d$utilities$2e$js__$5b$client$5d$__$28$ecmascript$29$__["encodeLongLongInt"])(String(countInt)));
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/TOTP-Tool/utilities/byte-bit-rendering.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RenderBits",
    ()=>RenderBits,
    "RenderBytes",
    ()=>RenderBytes
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
function RenderBits(number) {
    const binaryString = number.toString(2).padStart(8, '0');
    const bits = binaryString.split('');
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            display: 'flex',
            gap: '2px'
        },
        children: bits.map((bit, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    border: '1px solid black',
                    padding: '0px',
                    width: '20px',
                    textAlign: 'center',
                    fontFamily: 'monospace'
                },
                children: bit
            }, index, false, {
                fileName: "[project]/components/TOTP-Tool/utilities/byte-bit-rendering.js",
                lineNumber: 8,
                columnNumber: 17
            }, this))
    }, void 0, false, {
        fileName: "[project]/components/TOTP-Tool/utilities/byte-bit-rendering.js",
        lineNumber: 6,
        columnNumber: 13
    }, this);
}
_c = RenderBits;
function RenderBytes(byteUint8Array) {
    const byteArray = Array.from(byteUint8Array);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bytesTable",
        style: {
            display: 'flex',
            gap: '2px'
        },
        children: byteArray.map((bit, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    border: '1px solid black',
                    padding: '0px',
                    width: '50px',
                    textAlign: 'center',
                    fontFamily: 'monospace'
                },
                children: bit
            }, index, false, {
                fileName: "[project]/components/TOTP-Tool/utilities/byte-bit-rendering.js",
                lineNumber: 32,
                columnNumber: 13
            }, this))
    }, void 0, false, {
        fileName: "[project]/components/TOTP-Tool/utilities/byte-bit-rendering.js",
        lineNumber: 30,
        columnNumber: 9
    }, this);
}
_c1 = RenderBytes;
var _c, _c1;
__turbopack_context__.k.register(_c, "RenderBits");
__turbopack_context__.k.register(_c1, "RenderBytes");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/TOTP-Tool/utilities/interval-more-details.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RenderIntervalMoreDetails",
    ()=>RenderIntervalMoreDetails,
    "RenderIntervals",
    ()=>RenderIntervals
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/utilities/base64.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$byte$2d$bit$2d$rendering$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/TOTP-Tool/utilities/byte-bit-rendering.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Accordion$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Accordion.js [client] (ecmascript)");
;
;
;
;
function RenderIntervalMoreDetails(item) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Part 1: Calculate Hop Count"
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 12,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        "Calculate the number of 30 second intervals (hops) since ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Epoch Time"
                        }, void 0, false, {
                            fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                            lineNumber: 13,
                            columnNumber: 77
                        }, this),
                        " (midnight Jan 1, 1970 UTC) to ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: item.name
                        }, void 0, false, {
                            fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                            lineNumber: 13,
                            columnNumber: 125
                        }, this),
                        "."
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 13,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: [
                                "Time (",
                                item.name,
                                "):"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                            lineNumber: 15,
                            columnNumber: 23
                        }, this),
                        " ",
                        item.strTime
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 15,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 15,
                    columnNumber: 71
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Time since Epoch:"
                        }, void 0, false, {
                            fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                            lineNumber: 17,
                            columnNumber: 23
                        }, this),
                        " ",
                        item.epochTime / 1000,
                        " seconds"
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 17,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 17,
                    columnNumber: 88
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                    children: "Hop Count"
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 19,
                    columnNumber: 17
                }, this),
                " = Time Since Epoch / 30 seconds ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 19,
                    columnNumber: 66
                }, this),
                "= ",
                item.epochTime / 1000,
                " seconds / 30 seconds ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 20,
                    columnNumber: 78
                }, this),
                "= ",
                item.hopCount,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 22,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 23,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Part 2: HMAC-SHA1 Hash"
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 24,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        "Calculate the HMAC-SHA1 hash of the ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Hop Count"
                        }, void 0, false, {
                            fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                            lineNumber: 25,
                            columnNumber: 56
                        }, this),
                        " using the ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Secret Key"
                        }, void 0, false, {
                            fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                            lineNumber: 25,
                            columnNumber: 83
                        }, this),
                        "."
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 25,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                    children: "Hop Count: "
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 26,
                    columnNumber: 17
                }, this),
                " ",
                item.hopCount,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 26,
                    columnNumber: 51
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                    children: "Secret Key: "
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 27,
                    columnNumber: 17
                }, this),
                " ",
                item.secretKey,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 27,
                    columnNumber: 53
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 28,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                    children: "HMAC-SHA1 Hash (Base64):"
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 29,
                    columnNumber: 17
                }, this),
                " HMAC-SHA1(Secret Key, Hop Count) ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 29,
                    columnNumber: 82
                }, this),
                "= ",
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["arrayBufferToBase64"])(item.hmacSig),
                " ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 30,
                    columnNumber: 55
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 31,
                    columnNumber: 17
                }, this),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$byte$2d$bit$2d$rendering$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RenderBytes"])(item.hmacSig),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 33,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Part 3: Calculate Offset"
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 34,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        "Offset is the ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "last 4 bits of the above HMAC-SHA1 hash."
                        }, void 0, false, {
                            fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                            lineNumber: 35,
                            columnNumber: 34
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 35,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                    children: "Last Byte of HMAC-SHA1:"
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 36,
                    columnNumber: 17
                }, this),
                " ",
                item.lastByte,
                "   ",
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$byte$2d$bit$2d$rendering$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RenderBits"])(item.lastByte),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 37,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                    children: "Offset:"
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 38,
                    columnNumber: 17
                }, this),
                " Extract last 4 bits of last byte",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 38,
                    columnNumber: 64
                }, this),
                "= Last Byte & 0x0F",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 39,
                    columnNumber: 35
                }, this),
                "= ",
                item.lastByte,
                " & 0x0F",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 40,
                    columnNumber: 41
                }, this),
                "= ",
                item.offset,
                "       ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 41,
                    columnNumber: 39
                }, this),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$byte$2d$bit$2d$rendering$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RenderBits"])(item.offset),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 43,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 44,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Part 4: Truncated Hash"
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 46,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: "Truncated Hash is a 4 byte extraction of the HMAC-SHA1 hash starting from the Offset index."
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 47,
                    columnNumber: 17
                }, this),
                "Full HMAC-SHA1 Hash (Byte Array):",
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$byte$2d$bit$2d$rendering$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RenderBytes"])(item.hmacSig),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 51,
                    columnNumber: 17
                }, this),
                "Truncated Hash = SHA1-Hash[Offset: (Offset + 4)] ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 52,
                    columnNumber: 66
                }, this),
                "= SHA1-Hash[",
                item.offset,
                " : (",
                item.offset,
                " + 4)] ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 53,
                    columnNumber: 82
                }, this),
                "= SHA1-Hash[",
                item.offset,
                " : ",
                item.offset + 4,
                "] ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 54,
                    columnNumber: 80
                }, this),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$byte$2d$bit$2d$rendering$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RenderBytes"])(item.truncatedBytes),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 56,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 57,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Part 5: Long TOTP Code"
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 58,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        "Long TOTP code calculated by representing the ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "4-byte Truncated Hash"
                        }, void 0, false, {
                            fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                            lineNumber: 59,
                            columnNumber: 66
                        }, this),
                        " as a single ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Unsigned 32-bit Integer"
                        }, void 0, false, {
                            fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                            lineNumber: 59,
                            columnNumber: 107
                        }, this),
                        "."
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 59,
                    columnNumber: 17
                }, this),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$byte$2d$bit$2d$rendering$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RenderBytes"])(item.truncatedBytes),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                    children: "Long TOTP Code:"
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 62,
                    columnNumber: 17
                }, this),
                " ",
                item.longTOTPCode,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 62,
                    columnNumber: 59
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 64,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 65,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Part 6: Short TOTP Code"
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 67,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: "Extract only the last 6 digits for standard TOTP authenticator format."
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 68,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                    children: "Short TOTP Code:"
                }, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 70,
                    columnNumber: 17
                }, this),
                " ",
                item.shortTOTPCodeFormatted,
                " ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                    lineNumber: 70,
                    columnNumber: 71
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
            lineNumber: 10,
            columnNumber: 13
        }, this)
    }, void 0, false);
}
_c = RenderIntervalMoreDetails;
function RenderIntervals(TOTPList) {
    return TOTPList.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Accordion$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].Item, {
                class: "interval-item",
                id: "interval-id" + item.id,
                eventKey: item.id,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Accordion$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].Header, {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '15px'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        border: '1px solid #000',
                                        borderRadius: '5px',
                                        width: '75px',
                                        paddingLeft: 'auto',
                                        paddingRight: 'auto'
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                            class: "bi bi-clock"
                                        }, void 0, false, {
                                            fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                                            lineNumber: 81,
                                            columnNumber: 224
                                        }, this),
                                        " ",
                                        item.name
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                                    lineNumber: 81,
                                    columnNumber: 105
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: [
                                            item.shortTOTPCodeFormatted.slice(0, 3),
                                            " ",
                                            item.shortTOTPCodeFormatted.slice(3, 6)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                                        lineNumber: 81,
                                        columnNumber: 274
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                                    lineNumber: 81,
                                    columnNumber: 269
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                            lineNumber: 81,
                            columnNumber: 39
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                        lineNumber: 81,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Accordion$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].Body, {
                        children: RenderIntervalMoreDetails(item)
                    }, void 0, false, {
                        fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                        lineNumber: 82,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/TOTP-Tool/utilities/interval-more-details.js",
                lineNumber: 80,
                columnNumber: 17
            }, this)
        }, void 0, false));
}
_c1 = RenderIntervals;
var _c, _c1;
__turbopack_context__.k.register(_c, "RenderIntervalMoreDetails");
__turbopack_context__.k.register(_c1, "RenderIntervals");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/TOTP-Tool/TOTP-Tool.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TOTPTool
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Button.js [client] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Container$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Container$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Container.js [client] (ecmascript) <export default as Container>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Modal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Modal$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Modal.js [client] (ecmascript) <export default as Modal>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Accordion$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Accordion.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$generate$2d$base$2d$32$2d$key$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/TOTP-Tool/utilities/generate-base-32-key.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$base32$2d$utilities$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/TOTP-Tool/utilities/base32-utilities.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/utilities/base64.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$hmac$2d$sha1$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/TOTP-Tool/utilities/hmac-sha1.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$interval$2d$more$2d$details$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/TOTP-Tool/utilities/interval-more-details.js [client] (ecmascript)");
//const base32Decode = require('base32-decode')
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$base32$2d$decode$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/base32-decode/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$qrcode$2f$lib$2f$browser$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/qrcode/lib/browser.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
;
;
function TOTPTool() {
    _s();
    const [secretKeyValue, setSecretKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$generate$2d$base$2d$32$2d$key$2e$js__$5b$client$5d$__$28$ecmascript$29$__["GenerateBase32SecretKey"])());
    const [QRImgValue, setQRImgValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('bbb');
    const [QRTextValue, setQRTextValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('bbb');
    const [currTimeValue, setCurrTimeValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(new Date());
    const [currTimeStr, setCurrTimeStr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(currTimeValue.toUTCString());
    const [currTimeEpoch, setCurrTimeEpoch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(new Date().toUTCString());
    const [openIntervalTabNo, setOpenIntervalTabNo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(-1);
    const [providerName, setProviderName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('AuthFuture');
    const [QRUsername, setQRUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('random@random.com');
    const [QRDetailsModalShow, setQRDetailsModalShow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showTOTPErrorBox, setShowTOTPErrorBox] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [tempSecretKey, setTempSecretKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(secretKeyValue);
    const secretKeyRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(secretKeyValue);
    const [TOTPList, setTOTPList] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TOTPTool.useEffect": ()=>{
            secretKeyRef.current = secretKeyValue;
            updateTOTPCalculation();
        }
    }["TOTPTool.useEffect"], []);
    //Updates both QR Image and Text
    function updateQRTextImage() {
        let qrCodeLabel = 'AuthFuture';
        let qrCodeEmail = "username";
        let qrCodeSecret = secretKeyValue;
        let qrCodeDigits = 6;
        let qrCodePeriod = 30;
        let qrCodeStr = 'otpauth://totp/' + providerName + ':' + QRUsername + '?secret=' + qrCodeSecret + '&issuer=' + qrCodeLabel + '&digits=' + qrCodeDigits + '&period=' + qrCodePeriod;
        setQRTextValue(qrCodeStr);
        //const QRCode = require('qrcode');
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$qrcode$2f$lib$2f$browser$2e$js__$5b$client$5d$__$28$ecmascript$29$__["toDataURL"](qrCodeStr, {
            errorCorrectionLevel: 'H',
            type: 'image/png'
        }, function(err, url) {
            if (err) throw err;
            setQRImgValue(url);
        });
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TOTPTool.useEffect": ()=>{
            secretKeyRef.current = secretKeyValue;
            updateQRTextImage();
            updateTOTPCalculation();
        }
    }["TOTPTool.useEffect"], [
        secretKeyValue,
        QRUsername,
        providerName
    ]);
    function clickGenerateSecretKey() {
        const randomKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$generate$2d$base$2d$32$2d$key$2e$js__$5b$client$5d$__$28$ecmascript$29$__["GenerateBase32SecretKey"])();
        setSecretKey(randomKey);
        setShowTOTPErrorBox(false);
        setTempSecretKey(randomKey);
    }
    function handleNewKey(key) {
        console.log('-------------------------ERROR----------------');
        setTempSecretKey(key);
        console.log('RAN6');
        console.log(key);
        try {
            const decodedArray = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$base32$2d$decode$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$base32$2d$utilities$2e$js__$5b$client$5d$__$28$ecmascript$29$__["fixBase32Padding"])(key), 'RFC4648');
            if (decodedArray.byteLength !== 0) {
                setShowTOTPErrorBox(false);
                setSecretKey(key);
            } else {
                setShowTOTPErrorBox(true);
                return;
            }
        } catch (error) {
            setShowTOTPErrorBox(true);
            return;
        }
    }
    //-------------------------------------------------------------------------
    //INTERVAL 
    // Executes every 30 seconds
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TOTPTool.useEffect": ()=>{
            const interval = setInterval({
                "TOTPTool.useEffect.interval": ()=>{
                    //secretKeyRef.current = secretKeyValue
                    updateTOTPCalculation();
                }
            }["TOTPTool.useEffect.interval"], 30000);
            return ({
                "TOTPTool.useEffect": ()=>clearInterval(interval)
            })["TOTPTool.useEffect"];
        }
    }["TOTPTool.useEffect"], []);
    async function updateTOTPCalculation() {
        //Update global time
        const timeEpoch = Date.now();
        setCurrTimeEpoch(new Date(timeEpoch).toUTCString());
        let TOTPListNew = [];
        const TOTPTimeOffsets = [
            -90,
            -60,
            -30,
            0,
            30,
            60,
            90
        ];
        for(let idx = 0; idx <= 6; idx++){
            const item = TOTPTimeOffsets[idx];
            let name = "";
            if (TOTPTimeOffsets[idx] < 0) {
                name = 'T' + parseInt(item) + 's';
            } else if (TOTPTimeOffsets[idx] > 0) {
                name = 'T+' + parseInt(item) + 's';
            } else {
                name = 'Now';
            }
            //Step 0 Initialisation
            TOTPListNew.push({
                'id': idx,
                'name': name,
                'timeOffset': item,
                'epochTime': timeEpoch + item * 1000,
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
            });
            //Step 1 & Step 2: Update Time for Item
            TOTPListNew[idx].strTime = new Date(TOTPListNew[idx].epochTime).toUTCString();
            //Step 3: Update Hop Count
            TOTPListNew[idx].hopCount = parseInt(TOTPListNew[idx].epochTime / 1000 / 30);
            //Step 4: Encode hop count as long long int
            //Step 5: HMAC Hash    
            TOTPListNew[idx].hmacSig = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$hmac$2d$sha1$2e$js__$5b$client$5d$__$28$ecmascript$29$__["hmacSha1"])(secretKeyRef.current, TOTPListNew[idx].hopCount);
            //const asciiHash = atob(arrayBufferToBase64(hmacSig));
            TOTPListNew[idx].asciiHash = atob((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["arrayBufferToBase64"])(TOTPListNew[idx].hmacSig));
            // Get last character (each char = 1 byte)
            //const lastByte = asciiHash[asciiHash.length - 1].charCodeAt(0);
            TOTPListNew[idx].lastByte = TOTPListNew[idx].asciiHash[TOTPListNew[idx].asciiHash.length - 1].charCodeAt(0);
            // Convert char to byte value (0–255)
            console.log('LastByte');
            console.log(TOTPListNew[idx].lastByte);
            //const offset = lastByte & 0x0F
            TOTPListNew[idx].offset = TOTPListNew[idx].lastByte & 0x0F;
            console.log('Offset');
            console.log(TOTPListNew[idx].offset);
            TOTPListNew[idx].truncatedHash = TOTPListNew[idx].hmacSig.slice(TOTPListNew[idx].offset, TOTPListNew[idx].offset + 4);
            console.log('Truncated Hash');
            console.log(TOTPListNew[idx].truncatedHash);
            //Long Code
            TOTPListNew[idx].truncatedBytes = new Uint8Array(TOTPListNew[idx].truncatedHash);
            console.log('Truncated Bytes');
            console.log(TOTPListNew[idx].truncatedBytes);
            const dataView = new DataView(TOTPListNew[idx].truncatedBytes.buffer, TOTPListNew[idx].truncatedBytes.byteOffset, TOTPListNew[idx].truncatedBytes.byteLength);
            let code = dataView.getUint32(0, false);
            TOTPListNew[idx].longTOTPCode = code & 0x7FFFFFFF;
            console.log('Long Code');
            console.log(TOTPListNew[idx].longTOTPCode);
            TOTPListNew[idx].shortTOTPCode = TOTPListNew[idx].longTOTPCode % 10 ** 6;
            console.log('Short Code');
            console.log(TOTPListNew[idx].shortTOTPCode);
            TOTPListNew[idx].shortTOTPCodeFormatted = String(TOTPListNew[idx].shortTOTPCode).padStart(6, '0');
        }
        setTOTPList(TOTPListNew);
    }
    function QRCodeModal() {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Modal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Modal$3e$__["Modal"], {
                show: QRDetailsModalShow,
                onHide: (event)=>{
                    setQRDetailsModalShow(false);
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Modal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Modal$3e$__["Modal"].Header, {
                        closeButton: true,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Modal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Modal$3e$__["Modal"].Title, {
                            children: "QR Code Content"
                        }, void 0, false, {
                            fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                            lineNumber: 263,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                        lineNumber: 262,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Modal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Modal$3e$__["Modal"].Body, {
                        style: {
                            textWrap: 'wrap',
                            textWrapStyle: 'pretty',
                            overflowWrap: 'break-word'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                children: QRTextValue
                            }, void 0, false, {
                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                lineNumber: 265,
                                columnNumber: 117
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                            lineNumber: 265,
                            columnNumber: 112
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                        lineNumber: 265,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                lineNumber: 261,
                columnNumber: 17
            }, this)
        }, void 0, false);
    }
    //-------------------------------------------------------------------------
    // RENDERING SECTION
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            style: {
                backgroundColor: '#2a2a2a',
                paddingTop: '20px',
                paddingBottom: '20px'
            },
            className: "text-white",
            id: "totp-section",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Container$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Container$3e$__["Container"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "stylesheet",
                        href: "/css/totp-tool.css"
                    }, void 0, false, {
                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                        lineNumber: 278,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        children: "Time-Based One Time Passwords"
                    }, void 0, false, {
                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                        lineNumber: 279,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        id: "totp-tool-container",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                id: "generating-qr-code",
                                style: {
                                    paddingTop: '10px',
                                    paddingBottom: '30px'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                class: "bi bi-sliders"
                                            }, void 0, false, {
                                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                lineNumber: 283,
                                                columnNumber: 33
                                            }, this),
                                            " Configuration"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                        lineNumber: 283,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        id: "otp-secret",
                                        style: {
                                            gap: '20px'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                id: "qr-code",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        id: "otp-qr-code",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                            src: QRImgValue,
                                                            width: "100%",
                                                            height: "100%"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                            lineNumber: 290,
                                                            columnNumber: 41
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                        lineNumber: 289,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            textAlign: 'center',
                                                            paddingTop: '5px'
                                                        },
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                                            variant: "outline-light",
                                                            onClick: (event)=>{
                                                                setQRDetailsModalShow(true);
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                    class: "bi bi-plus"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                    lineNumber: 293,
                                                                    columnNumber: 124
                                                                }, this),
                                                                "QR Code Content"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                            lineNumber: 293,
                                                            columnNumber: 41
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                        lineNumber: 292,
                                                        columnNumber: 37
                                                    }, this),
                                                    QRCodeModal()
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                lineNumber: 288,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                id: "key-section",
                                                style: {
                                                    width: '100%'
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "totp-qr-name section-row py-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                    children: "Issuer:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                    lineNumber: 299,
                                                                    columnNumber: 48
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                lineNumber: 299,
                                                                columnNumber: 41
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "text",
                                                                className: "bg-white text-black",
                                                                value: providerName,
                                                                onChange: (event)=>{
                                                                    setProviderName(event.target.value);
                                                                }
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                lineNumber: 300,
                                                                columnNumber: 41
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                        lineNumber: 298,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "totp-qr-username section-row py-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                    children: "Username:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                    lineNumber: 303,
                                                                    columnNumber: 48
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                lineNumber: 303,
                                                                columnNumber: 41
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "text",
                                                                className: "bg-white text-black",
                                                                value: QRUsername,
                                                                onChange: (event)=>{
                                                                    setQRUsername(event.target.value);
                                                                }
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                lineNumber: 304,
                                                                columnNumber: 41
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                        lineNumber: 302,
                                                        columnNumber: 37
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "secret-key-text section-row py-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                    children: "Secret Key:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                    lineNumber: 307,
                                                                    columnNumber: 48
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                lineNumber: 307,
                                                                columnNumber: 41
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                id: "otp-secret-code",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                    type: "text",
                                                                    className: "bg-white text-black",
                                                                    value: tempSecretKey,
                                                                    onChange: (event)=>{
                                                                        handleNewKey(event.target.value);
                                                                    }
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                    lineNumber: 308,
                                                                    columnNumber: 68
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                lineNumber: 308,
                                                                columnNumber: 41
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                        lineNumber: 306,
                                                        columnNumber: 37
                                                    }, this),
                                                    showTOTPErrorBox && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        class: "alert alert-danger alert-dismissible fade show mt-3 errorBox",
                                                        role: "alert",
                                                        style: {
                                                            paddingTop: '0px',
                                                            paddingBottom: '5px'
                                                        },
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            class: "errorMessage",
                                                            style: {
                                                                fontSize: '16px'
                                                            },
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                                                    children: "Invalid Secret Key: "
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                    lineNumber: 312,
                                                                    columnNumber: 99
                                                                }, this),
                                                                " Secret Key must be in Base 32 format"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                            lineNumber: 312,
                                                            columnNumber: 45
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                        lineNumber: 311,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        id: "key-update-buttons",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                                            variant: "light",
                                                            onClick: clickGenerateSecretKey,
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                    class: "bi bi-arrow-repeat"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                                    lineNumber: 316,
                                                                    columnNumber: 98
                                                                }, this),
                                                                " Generate"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                            lineNumber: 316,
                                                            columnNumber: 41
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                        lineNumber: 315,
                                                        columnNumber: 37
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                lineNumber: 297,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                        lineNumber: 287,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                lineNumber: 282,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                id: "totp-calculator",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        children: "Valid Codes"
                                    }, void 0, false, {
                                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                        lineNumber: 322,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                            class: "bi bi-clock"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                            lineNumber: 325,
                                                            columnNumber: 43
                                                        }, this),
                                                        " ",
                                                        currTimeEpoch,
                                                        " (UTC)"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                    lineNumber: 325,
                                                    columnNumber: 37
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                lineNumber: 324,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Accordion$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$utilities$2f$interval$2d$more$2d$details$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RenderIntervals"])(TOTPList)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                    lineNumber: 328,
                                                    columnNumber: 37
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                                lineNumber: 327,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                        lineNumber: 323,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                                lineNumber: 321,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                        lineNumber: 281,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
                lineNumber: 277,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/TOTP-Tool/TOTP-Tool.js",
            lineNumber: 276,
            columnNumber: 13
        }, this)
    }, void 0, false);
}
_s(TOTPTool, "FeDOUo6POLDufo3P/bdD95Ttu1A=");
_c = TOTPTool;
var _c;
__turbopack_context__.k.register(_c, "TOTPTool");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/WebAuthn-Tool/utilities/generate-base-32-key.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GenerateBase32SecretKey",
    ()=>GenerateBase32SecretKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$randomstring$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/randomstring/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hi$2d$base32$2f$src$2f$base32$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/hi-base32/src/base32.js [client] (ecmascript)");
;
;
function GenerateBase32SecretKey() {
    //var randomstring = require("randomstring");
    const outputStr = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$randomstring$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["generate"]();
    //const base32 = require('hi-base32');
    const encoded = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hi$2d$base32$2f$src$2f$base32$2e$js__$5b$client$5d$__$28$ecmascript$29$__["encode"](outputStr);
    return encoded;
}
_c = GenerateBase32SecretKey;
var _c;
__turbopack_context__.k.register(_c, "GenerateBase32SecretKey");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/WebAuthn-Tool/utilities/concat-array-buffers.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "concatArrayBuffers",
    ()=>concatArrayBuffers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/utilities/base64.js [client] (ecmascript)");
;
function concatArrayBuffers(buffer1, buffer2) {
    const totalLength = buffer1.byteLength + buffer2.byteLength;
    const result = new Uint8Array(totalLength);
    result.set(new Uint8Array(buffer1), 0);
    result.set(new Uint8Array(buffer2), buffer1.byteLength);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["arrayBufferToBase64"])(result.buffer);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PasskeyExplanation",
    ()=>PasskeyExplanation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$export__ReactFlow__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/@reactflow/core/dist/esm/index.mjs [client] (ecmascript) <export ReactFlow as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@reactflow/core/dist/esm/index.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Button.js [client] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$ButtonGroup$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ButtonGroup$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/ButtonGroup.js [client] (ecmascript) <export default as ButtonGroup>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
const CustomNode = (param)=>{
    let { data } = param;
    const handles = Array.isArray(data === null || data === void 0 ? void 0 : data.handles) ? data.handles : [];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            border: '0px solid ' + data.bgColor,
            borderRadius: '12px',
            width: '200px',
            height: data.height ? data.height : '100px',
            zIndex: 10,
            position: 'relative'
        },
        children: [
            handles.map((handle, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Handle"], {
                    type: handle.type,
                    position: handle.position,
                    id: handle.id,
                    style: handle.style || {}
                }, index, false, {
                    fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                    lineNumber: 16,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0))),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    paddingLeft: 'auto',
                    paddingRight: 'auto',
                    opacity: 1,
                    border: '3px solid rgb(155, 89, 182)',
                    borderRadius: '10px',
                    width: '100%',
                    height: '100%'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    id: "node-label",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            fontSize: '14px',
                            color: '#FFF'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                class: data.icon ? data.icon : ''
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                                lineNumber: 26,
                                columnNumber: 69
                            }, ("TURBOPACK compile-time value", void 0)),
                            " ",
                            data.label
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                        lineNumber: 26,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                    lineNumber: 25,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                lineNumber: 24,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
        lineNumber: 14,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c = CustomNode;
const PlatformNode = (param)=>{
    let { data } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            padding: 10,
            border: '1px solid rgb(17, 17, 17)',
            borderRadius: 5,
            color: '#FFF',
            background: 'rgb(17, 17, 17)',
            width: '1200px',
            height: '200px',
            zIndex: -1,
            position: 'relative'
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                style: {
                    fontSize: '20px'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                        class: data.icon
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                        lineNumber: 37,
                        columnNumber: 50
                    }, ("TURBOPACK compile-time value", void 0)),
                    " ",
                    data.platformName
                ]
            }, void 0, true, {
                fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                lineNumber: 37,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
            lineNumber: 36,
            columnNumber: 13
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
        lineNumber: 35,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_c1 = PlatformNode;
function PasskeyExplanation() {
    _s();
    const [passkeyDiagramTab, setPasskeyDiagramTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(0);
    function passkeyDiagram() {
        const nodeTypes = {
            custom: CustomNode,
            platform: PlatformNode
        };
        const registrationNodes = [
            {
                id: '0',
                type: 'platform',
                position: {
                    x: 0,
                    y: 0
                },
                data: {
                    platformName: 'Server',
                    icon: 'bi bi-hdd-stack-fill'
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            },
            {
                id: '1',
                type: 'platform',
                position: {
                    x: 0,
                    y: 250
                },
                data: {
                    platformName: 'Browser',
                    icon: 'bi bi-person-fill'
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            },
            {
                id: '2',
                type: 'platform',
                position: {
                    x: 0,
                    y: 500
                },
                data: {
                    platformName: 'Authenticator',
                    icon: 'bi bi-shield-fill-check'
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            },
            {
                id: '3',
                type: 'custom',
                position: {
                    x: 175,
                    y: 50
                },
                data: {
                    id: '3',
                    label: 'Credential Creation Options for Browser',
                    icon: 'bi bi-1-circle',
                    bgColor: 'rgb(155, 89, 182)',
                    handles: [
                        {
                            type: 'target',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Left,
                            id: 'input1'
                        },
                        {
                            type: 'source',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Bottom,
                            id: 'output1'
                        }
                    ]
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            },
            {
                id: '4',
                type: 'custom',
                position: {
                    x: 500,
                    y: 300
                },
                data: {
                    label: 'Browser calls navigator.credentials.create()',
                    icon: 'bi bi-2-circle',
                    bgColor: 'rgb(155, 89, 182)',
                    handles: [
                        {
                            type: 'target',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Left,
                            id: 'input1'
                        },
                        {
                            type: 'source',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Right,
                            id: 'output1'
                        },
                        {
                            type: 'source',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Bottom,
                            id: 'output2'
                        },
                        {
                            type: 'target',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Bottom,
                            id: 'input2'
                        }
                    ]
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            },
            {
                id: '5',
                type: 'custom',
                position: {
                    x: 500,
                    y: 550
                },
                data: {
                    label: 'Create Key Pair',
                    icon: 'bi bi-3-circle',
                    handles: [
                        {
                            type: 'target',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Top,
                            id: 'input1'
                        },
                        {
                            type: 'source',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Left,
                            id: 'output1'
                        }
                    ]
                },
                sourcePosition: 'up',
                targetPosition: 'top'
            },
            {
                id: '6',
                type: 'custom',
                position: {
                    x: 975,
                    y: 50
                },
                data: {
                    label: 'Store Public Key',
                    icon: 'bi bi-4-circle',
                    handles: [
                        {
                            type: 'target',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Bottom,
                            id: 'input1'
                        },
                        {
                            type: 'source',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Right,
                            id: 'output1'
                        }
                    ]
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            }
        ];
        const registrationEdges = [
            {
                id: 'e1-2',
                source: '3',
                target: '4',
                type: 'straight',
                markerEnd: {
                    type: 'arrowclosed'
                },
                style: {
                    strokeWidth: 3,
                    stroke: '#808080',
                    zIndex: 10,
                    borderWidth: '3px'
                }
            },
            {
                id: 'e2-3',
                source: '4',
                target: '5',
                type: 'straight',
                sourceHandle: 'output2',
                markerStart: {
                    type: 'arrowclosed'
                },
                markerEnd: {
                    type: 'arrowclosed'
                },
                style: {
                    strokeWidth: 3,
                    stroke: '#808080',
                    zIndex: 10
                }
            },
            {
                id: 'e3-4',
                source: '4',
                target: '6',
                type: 'straight',
                markerEnd: {
                    type: 'arrowclosed'
                },
                style: {
                    strokeWidth: 3,
                    stroke: '#808080',
                    zIndex: 10
                }
            }
        ];
        const verificationNodes = [
            {
                id: '0',
                type: 'platform',
                position: {
                    x: 0,
                    y: 0
                },
                data: {
                    platformName: 'Server',
                    icon: 'bi bi-hdd-stack-fill'
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            },
            {
                id: '1',
                type: 'platform',
                position: {
                    x: 0,
                    y: 250
                },
                data: {
                    platformName: 'Browser',
                    icon: 'bi bi-person-fill'
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            },
            {
                id: '2',
                type: 'platform',
                position: {
                    x: 0,
                    y: 500
                },
                data: {
                    platformName: 'Authenticator',
                    icon: 'bi bi-shield-fill-check'
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            },
            {
                id: '3',
                type: 'custom',
                position: {
                    x: 175,
                    y: 30
                },
                data: {
                    label: 'Server Generates Credential Verification Options',
                    icon: 'bi bi-1-circle',
                    height: '140px',
                    handles: [
                        {
                            type: 'target',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Left,
                            id: 'input1'
                        },
                        {
                            type: 'source',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Bottom,
                            id: 'output1'
                        }
                    ]
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            },
            {
                id: '4',
                type: 'custom',
                position: {
                    x: 500,
                    y: 300
                },
                data: {
                    label: 'Browser Calls navigator.credentials.get()',
                    icon: 'bi bi-2-circle',
                    handles: [
                        {
                            type: 'target',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Left,
                            id: 'input1'
                        },
                        {
                            type: 'source',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Right,
                            id: 'output1'
                        },
                        {
                            type: 'source',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Bottom,
                            id: 'output2'
                        }
                    ]
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            },
            {
                id: '5',
                type: 'custom',
                position: {
                    x: 500,
                    y: 550
                },
                data: {
                    label: 'Local Authenticator Returns Assertion Signature',
                    icon: 'bi bi-3-circle',
                    handles: [
                        {
                            type: 'target',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Top,
                            id: 'input1'
                        },
                        {
                            type: 'source',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Left,
                            id: 'output1'
                        }
                    ]
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            },
            {
                id: '6',
                type: 'custom',
                position: {
                    x: 750,
                    y: 300
                },
                data: {
                    label: 'Send Assertion Response to Server',
                    icon: 'bi bi-4-circle',
                    handles: [
                        {
                            type: 'target',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Left,
                            id: 'input1'
                        },
                        {
                            type: 'source',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Right,
                            id: 'output1'
                        }
                    ]
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            },
            {
                id: '7',
                type: 'custom',
                position: {
                    x: 975,
                    y: 30
                },
                data: {
                    label: 'Validate Assertion Signature with Stored Public Key',
                    icon: 'bi bi-5-circle',
                    height: '140px',
                    handles: [
                        {
                            type: 'target',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Bottom,
                            id: 'input1'
                        },
                        {
                            type: 'source',
                            position: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Position"].Right,
                            id: 'output1'
                        }
                    ]
                },
                sourcePosition: 'right',
                targetPosition: 'left'
            }
        ];
        const verificationEdges = [
            {
                id: 'e1-2',
                source: '1',
                target: '2',
                type: 'straight',
                markerEnd: {
                    type: 'arrowclosed'
                },
                style: {
                    strokeWidth: 3,
                    stroke: '#808080',
                    zIndex: 10
                }
            },
            {
                id: 'e2-3',
                source: '2',
                target: '3',
                type: 'straight',
                markerEnd: {
                    type: 'arrowclosed'
                },
                style: {
                    strokeWidth: 3,
                    stroke: '#808080',
                    zIndex: 10
                }
            },
            {
                id: 'e3-4',
                source: '3',
                target: '4',
                type: 'straight',
                markerEnd: {
                    type: 'arrowclosed'
                },
                style: {
                    strokeWidth: 3,
                    stroke: '#808080',
                    zIndex: 10
                }
            },
            {
                id: 'e4-5',
                source: '4',
                target: '5',
                sourceHandle: 'output2',
                type: 'straight',
                markerStart: {
                    type: 'arrowclosed'
                },
                markerEnd: {
                    type: 'arrowclosed'
                },
                style: {
                    strokeWidth: 3,
                    stroke: '#808080',
                    zIndex: 10
                }
            },
            {
                id: 'e4-6',
                source: '4',
                target: '6',
                type: 'straight',
                markerEnd: {
                    type: 'arrowclosed'
                },
                style: {
                    strokeWidth: 3,
                    stroke: '#808080',
                    zIndex: 10
                }
            },
            {
                id: 'e6-7',
                source: '6',
                target: '7',
                type: 'straight',
                markerEnd: {
                    type: 'arrowclosed'
                },
                style: {
                    strokeWidth: 3,
                    stroke: '#808080',
                    zIndex: 10
                }
            }
        ];
        if (passkeyDiagramTab == 0) {
            //Assertion (Registration)
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["ReactFlowProvider"], {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            width: '100%',
                            height: '750px'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$export__ReactFlow__as__default$3e$__["default"], {
                            colorMode: "dark",
                            nodes: registrationNodes,
                            edges: registrationEdges,
                            nodeTypes: nodeTypes,
                            fitView: true,
                            zoomOnScroll: false,
                            zoomOnPinch: false,
                            panOnScroll: false,
                            panOnDrag: false,
                            nodesDraggable: false,
                            nodesConnectable: false,
                            elementsSelectable: false,
                            preventScrolling: false,
                            panOnScrollMode: null
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                            lineNumber: 251,
                            columnNumber: 29
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                        lineNumber: 250,
                        columnNumber: 25
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                    lineNumber: 249,
                    columnNumber: 21
                }, this)
            }, void 0, false);
        } else {
            //Assertation (Verification)
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["ReactFlowProvider"], {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            width: '100%',
                            height: '750px'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$reactflow$2f$core$2f$dist$2f$esm$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__$3c$export__ReactFlow__as__default$3e$__["default"], {
                            nodes: verificationNodes,
                            edges: verificationEdges,
                            nodeTypes: nodeTypes,
                            fitView: true,
                            zoomOnScroll: false,
                            zoomOnPinch: false,
                            panOnScroll: false,
                            panOnDrag: false,
                            nodesDraggable: false,
                            nodesConnectable: false,
                            elementsSelectable: false,
                            preventScrolling: false,
                            panOnScrollMode: null
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                            lineNumber: 272,
                            columnNumber: 29
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                        lineNumber: 271,
                        columnNumber: 25
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                    lineNumber: 270,
                    columnNumber: 21
                }, this)
            }, void 0, false);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                display: 'flex',
                flexDirection: 'column'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: "Passkeys enable users to securely login to web apps using a local authenticator either as MFA or instead of a password."
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                        lineNumber: 295,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                    lineNumber: 294,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        width: '100%'
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$ButtonGroup$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ButtonGroup$3e$__["ButtonGroup"], {
                        "aria-label": "Basic example",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                variant: passkeyDiagramTab == 0 ? 'dark' : 'outline-dark',
                                onClick: (event)=>{
                                    setPasskeyDiagramTab(0);
                                },
                                children: "Passkey Registration (Assertation)"
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                                lineNumber: 299,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                variant: passkeyDiagramTab == 1 ? 'dark' : 'outline-dark',
                                onClick: (event)=>{
                                    setPasskeyDiagramTab(1);
                                },
                                children: "Passkey Verification (Assertion)"
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                                lineNumber: 300,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                        lineNumber: 298,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                    lineNumber: 297,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        width: '100%'
                    },
                    children: passkeyDiagram()
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
                    lineNumber: 303,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js",
            lineNumber: 293,
            columnNumber: 13
        }, this)
    }, void 0, false);
}
_s(PasskeyExplanation, "dr+tHIWdGtCNv9nknsNOGorzh04=");
_c2 = PasskeyExplanation;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "CustomNode");
__turbopack_context__.k.register(_c1, "PlatformNode");
__turbopack_context__.k.register(_c2, "PasskeyExplanation");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RenderListRegisteredPasskeys",
    ()=>RenderListRegisteredPasskeys
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Accordion$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Accordion$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Accordion.js [client] (ecmascript) <export default as Accordion>");
;
;
function renderPasskeys(savedCredentials) {
    return savedCredentials.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Accordion$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Accordion$3e$__["Accordion"].Item, {
                class: "webauthn-item",
                id: "webauthn-id" + item.idNum,
                eventKey: item.idNum,
                style: {
                    width: '100%'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Accordion$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Accordion$3e$__["Accordion"].Header, {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: [
                                "Passkey #",
                                item.idNum,
                                "     ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                    children: [
                                        "(ID: ",
                                        item.id,
                                        ")"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                    lineNumber: 8,
                                    columnNumber: 71
                                }, this),
                                " "
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                            lineNumber: 8,
                            columnNumber: 39
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                        lineNumber: 8,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Accordion$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Accordion$3e$__["Accordion"].Body, {
                        style: {
                            textWrap: 'wrap',
                            textWrapStyle: 'pretty',
                            overflowWrap: 'break-word'
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: "Credential ID: "
                                    }, void 0, false, {
                                        fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                        lineNumber: 10,
                                        columnNumber: 31
                                    }, this),
                                    " ",
                                    item.id
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                lineNumber: 10,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                lineNumber: 10,
                                columnNumber: 70
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: "Public Key (Base 64): "
                                    }, void 0, false, {
                                        fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                        lineNumber: 12,
                                        columnNumber: 31
                                    }, this),
                                    " "
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                lineNumber: 12,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                lineNumber: 12,
                                columnNumber: 68
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    textWrap: 'wrap',
                                    textWrapStyle: 'pretty',
                                    overflowWrap: 'break-word'
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    style: {
                                        textWrap: 'wrap',
                                        textWrapStyle: 'pretty',
                                        overflowWrap: 'break-word'
                                    },
                                    children: item.publicKey
                                }, void 0, false, {
                                    fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                    lineNumber: 15,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                lineNumber: 14,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: "Algorithm:"
                                    }, void 0, false, {
                                        fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                        lineNumber: 18,
                                        columnNumber: 31
                                    }, this),
                                    " ",
                                    item.alg
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                lineNumber: 18,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                lineNumber: 18,
                                columnNumber: 66
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: "Transports: "
                                    }, void 0, false, {
                                        fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                        lineNumber: 20,
                                        columnNumber: 31
                                    }, this),
                                    " ",
                                    item.transports
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                lineNumber: 20,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                lineNumber: 20,
                                columnNumber: 75
                            }, this),
                            item.transports == 'internal' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "alert alert-success",
                                role: "alert",
                                children: "Passkey may be used in passwordless mode"
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                lineNumber: 22,
                                columnNumber: 60
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "alert alert-danger",
                                role: "alert",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                        children: "External Authenticator:"
                                    }, void 0, false, {
                                        fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                        lineNumber: 22,
                                        columnNumber: 208
                                    }, this),
                                    " Unable to be used in passwordless mode"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                                lineNumber: 22,
                                columnNumber: 159
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                        lineNumber: 9,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                lineNumber: 7,
                columnNumber: 17
            }, this)
        }, void 0, false));
}
function RenderListRegisteredPasskeys(savedCredentials) {
    if (savedCredentials.length == 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    border: '1px solid #000',
                    borderStyle: 'dashed',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: '50px',
                    paddingBottom: '50px'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: "No registered passkeys."
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                    lineNumber: 37,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                lineNumber: 36,
                columnNumber: 17
            }, this)
        }, void 0, false);
    } else {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    border: '1px solid #000',
                    borderStyle: 'dashed',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: '50px',
                    paddingBottom: '50px'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Accordion$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Accordion$3e$__["Accordion"], {
                    style: {
                        maxWidth: '100%',
                        width: '100%'
                    },
                    children: renderPasskeys(savedCredentials)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                    lineNumber: 45,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js",
                lineNumber: 44,
                columnNumber: 17
            }, this)
        }, void 0, false);
    }
}
_c = RenderListRegisteredPasskeys;
var _c;
__turbopack_context__.k.register(_c, "RenderListRegisteredPasskeys");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/WebAuthn-Tool/utilities/webauthn-verification-algos.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "verifyES256",
    ()=>verifyES256,
    "verifyRS256",
    ()=>verifyRS256
]);
async function verifyES256(publicKeyRaw, signatureRaw, authenticatorDataJSONRaw, setAssertionVerified) {
    //Process Signature
    var usignature = new Uint8Array(signatureRaw);
    var rStart = usignature[4] === 0 ? 5 : 4;
    var rEnd = rStart + 32;
    var sStart = usignature[rEnd + 2] === 0 ? rEnd + 3 : rEnd + 2;
    var r = usignature.slice(rStart, rEnd);
    var s = usignature.slice(sStart);
    var rawSignature = new Uint8Array([
        ...r,
        ...s
    ]);
    let publicKeyECDSA = await crypto.subtle.importKey('spki', publicKeyRaw, {
        name: 'ECDSA',
        namedCurve: 'P-256',
        hash: {
            name: "SHA-256"
        } //added
    }, false, [
        'verify'
    ]);
    let verified = await crypto.subtle.verify({
        name: 'ECDSA',
        namedCurve: "P-256",
        hash: {
            name: 'SHA-256'
        }
    }, publicKeyECDSA, rawSignature, authenticatorDataJSONRaw // authData + SHA256(clientDataJSON)
    );
    console.log('Verified ECDSA');
    console.log(verified);
    if (verified) {
        setAssertionVerified(true);
    }
}
async function verifyRS256(publicKeyRaw, signatureRaw, authenticatorDataJSONRaw, setAssertionVerified) {
    let publicKeyRSA = await crypto.subtle.importKey('spki', publicKeyRaw, {
        name: 'RSASSA-PKCS1-v1_5',
        hash: {
            name: 'SHA-256'
        }
    }, true, [
        'verify'
    ]);
    let verified = await crypto.subtle.verify({
        name: 'RSASSA-PKCS1-v1_5',
        hash: {
            name: 'SHA-256'
        }
    }, publicKeyRSA, signatureRaw, authenticatorDataJSONRaw // authData + SHA256(clientDataJSON)
    );
    //console.log('Verified RSA')
    //console.log(verified)
    if (verified) {
        setAssertionVerified(true);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/WebAuthn-Tool/utilities/getter-functions.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAlgoDetails",
    ()=>getAlgoDetails,
    "getCredentialArrayStr",
    ()=>getCredentialArrayStr
]);
function getAlgoDetails(id, savedCredentials) {
    let output = {
        'algoNum': -7,
        'algoName': 'ES256'
    };
    savedCredentials.forEach((cred)=>{
        if (cred.id === id) {
            output.algoNum = cred.alg;
            if (output.algoNum === -7) {
                output.algoName = 'ES256';
            } else if (output.algoNum === -257) {
                output.algoName = 'RS256';
            }
        }
    });
    return output;
}
function getCredentialArrayStr(savedCredentials) {
    let creds = [];
    savedCredentials.forEach((cred)=>{
        creds.push({
            'id': cred.id,
            'type': 'public-key',
            'transports': cred.transports
        });
    });
    return JSON.stringify(creds, null, 20);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/WebAuthn-Tool/utilities/verification-methods-code-string.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "renderLoginPublicKeyJSON",
    ()=>renderLoginPublicKeyJSON,
    "renderLoginRetrievalJSON",
    ()=>renderLoginRetrievalJSON,
    "renderLoginVerifyJSON",
    ()=>renderLoginVerifyJSON
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$getter$2d$functions$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/utilities/getter-functions.js [client] (ecmascript)");
;
;
function renderLoginPublicKeyJSON(assertionData, savedCredentials) {
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$getter$2d$functions$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAlgoDetails"])(assertionData.id, savedCredentials)['algoName'] == 'RS256') {
        return "\n                    let publicKeyRSA = await crypto.subtle.importKey(\n                        'spki',                // Format of the key\n                        publicKeyRaw,             // ArrayBuffer from PEM\n                        {\n                            name: 'RSASSA-PKCS1-v1_5',  // or 'RSA-PSS'\n                            hash: { name: 'SHA-256' }\n                        },\n                        true,\n                        ['verify']\n                    );\n                    ";
    } else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$getter$2d$functions$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAlgoDetails"])(assertionData.id, savedCredentials)['algoName'] == 'ES256') {
        return "\n                    let publicKeyECDSA = await crypto.subtle.importKey(\n                        'spki', // Format of the key\n                        publicKeyRaw, // ArrayBuffer from PEM\n                        {\n                            name: 'ECDSA',\n                            namedCurve: 'P-256',\n                            hash: { name: \"SHA-256\" }   //added\n                        },\n                        false, //true\n                        ['verify']\n                    );\n                    ";
    }
}
function renderLoginVerifyJSON(assertionData, savedCredentials) {
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$getter$2d$functions$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAlgoDetails"])(assertionData.id, savedCredentials)['algoName'] == 'RS256') {
        return "\n                    let verified = await crypto.subtle.verify(\n                        {\n                        name: 'RSASSA-PKCS1-v1_5',\n                        hash: { name: 'SHA-256' }\n                        },\n                        Base64.decode(assertation.publicKeyRSA),        // Public Key sourced from Passkey Registration (Assertation stage)\n                        Base64.decode(assertion.signatureRaw),          // Assertion Signature\n                        Base64.decode(assertion.authenticatorDataJSON)  // authData + SHA256(clientDataJSON)\n                    );\n                    ";
    } else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$getter$2d$functions$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getAlgoDetails"])(assertionData.id, savedCredentials)['algoName'] == 'ES256') {
        return "\n                    let verified = await crypto.subtle.verify(\n                            {\n                                name: 'ECDSA',\n                                namedCurve: \"P-256\", //added\n                                hash: { name: 'SHA-256' }\n                            },\n                            publicKeyECDSA,\n                            rawSignature, // Signature from authenticator\n                            authenticatorDataJSONRaw // authData + SHA256(clientDataJSON)\n                    );\n                    ";
    }
}
function renderLoginRetrievalJSON(passwordlessMode, challenge, savedCredentials) {
    if (passwordlessMode == false) {
        return '\n                    navigator.credentials.get(\n                        "publicKey": {\n                            "challenge": Uint8Array.from("'.concat(challenge, '"),\n                            "rpId": "authfuture.com", \n                            allowCredentials: ').concat((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$getter$2d$functions$2e$js__$5b$client$5d$__$28$ecmascript$29$__["getCredentialArrayStr"])(savedCredentials), ',\n                            "userVerification": "preferred",\n                        }\n                    )\n                    ');
    } else {
        return '\n                    navigator.credentials.get(\n                        "publicKey": {\n                            "challenge": Uint8Array.from("'.concat(challenge, '"),\n                            "rpId": "authfuture.com", \n                            "userVerification": "preferred",\n                        }\n                    )\n                    ');
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/WebAuthn-Tool/WebAuthn-Tool.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>WebAuthnTool
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Button.js [client] (ecmascript) <export default as Button>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Container$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Container$3e$__ = __turbopack_context__.i("[project]/node_modules/react-bootstrap/esm/Container.js [client] (ecmascript) <export default as Container>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$highlight$2e$js$2f$es$2f$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/highlight.js/es/core.js [client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$highlight$2e$js$2f$es$2f$languages$2f$javascript$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/highlight.js/es/languages/javascript.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$crypto$2d$js$2f$sha256$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/crypto-js/sha256.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$prism$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Prism$3e$__ = __turbopack_context__.i("[project]/node_modules/react-syntax-highlighter/dist/esm/prism.js [client] (ecmascript) <export default as Prism>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$styles$2f$prism$2f$coldark$2d$dark$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__coldarkDark$3e$__ = __turbopack_context__.i("[project]/node_modules/react-syntax-highlighter/dist/esm/styles/prism/coldark-dark.js [client] (ecmascript) <export default as coldarkDark>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$generate$2d$base$2d$32$2d$key$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/utilities/generate-base-32-key.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/utilities/base64.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$concat$2d$array$2d$buffers$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/utilities/concat-array-buffers.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$WebAuthnGraph$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/utilities/WebAuthnGraph.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$list$2d$registered$2d$passkeys$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/utilities/list-registered-passkeys.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$webauthn$2d$verification$2d$algos$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/utilities/webauthn-verification-algos.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$verification$2d$methods$2d$code$2d$string$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/utilities/verification-methods-code-string.js [client] (ecmascript)");
//const CryptoJS = require("crypto-js");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$crypto$2d$js$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/crypto-js/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$highlight$2e$js$2f$es$2f$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].registerLanguage("javascript", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$highlight$2e$js$2f$es$2f$languages$2f$javascript$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"]);
function WebAuthnTool() {
    _s();
    const [registerNewPasskeyTab, setRegisterNewPasskeyTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [loginWithPasskeyTab, setLoginWithPasskeyTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [challenge, setChallenge] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["GenerateBase64SecretKey"])());
    const [fullname, setFullname] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("John Smith");
    const [username, setUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("Username");
    const [currCredID, setCurrCredID] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [currPublicKey, setCurrPublicKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [currAlg, setCurrAlg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [currJSON, setCurrJSON] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [currTransports, setCurrTransports] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [savedCredentials, setSavedCredentials] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [passwordlessMode, setPasswordlessMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [displaySpinner, setDisplaySpinner] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [assertionData, setAssertionData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])({
        "id": "",
        "authenticatorData": "",
        "clientDataJSON": "",
        "signature": "",
        "userHandle": ""
    });
    const [assertionVerified, setAssertionVerified] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [validationCalculations, setValidationCalculations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])({
        'id': '',
        'clientDataJSON': '',
        'hmac-sha256': '',
        'authenticatorJSONCombined': ''
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WebAuthnTool.useEffect": ()=>{
            if (registerNewPasskeyTab == 1 || loginWithPasskeyTab == 1) {
                setChallenge((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["GenerateBase64SecretKey"])());
            }
        }
    }["WebAuthnTool.useEffect"], [
        registerNewPasskeyTab,
        loginWithPasskeyTab
    ]);
    function toggleRegisterNewPasskeyTab() {
        if (registerNewPasskeyTab === 0) {
            setRegisterNewPasskeyTab((registerNewPasskeyTab)=>1);
        } else {
            setRegisterNewPasskeyTab((registerNewPasskeyTab)=>0);
        }
    }
    function togglePasskeyLoginTab() {
        if (loginWithPasskeyTab === 0) {
            setLoginWithPasskeyTab((loginWithPasskeyTab)=>1);
        } else {
            setLoginWithPasskeyTab((loginWithPasskeyTab)=>0);
        }
    }
    function registerPasskey() {
        setDisplaySpinner(true);
        navigator.credentials.create({
            "publicKey": {
                "challenge": __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Base64Binary"].decode(challenge),
                "rp": {
                    "id": window.location.hostname,
                    "name": "AuthFuture"
                },
                "user": {
                    "id": Uint8Array.from('user-id-1234', (c)=>c.charCodeAt(0)),
                    "name": username,
                    "displayName": fullname
                },
                "pubKeyCredParams": [
                    {
                        "type": "public-key",
                        "alg": -7
                    },
                    {
                        "type": "public-key",
                        "alg": -257
                    }
                ],
                "authenticatorSelection": {
                    "userVerification": "preferred",
                    "requireResidentKey": false
                },
                "excludeCredentials": getCredentialArray()
            }
        }).then((response)=>{
            console.log('Returned');
            console.log(response);
            const decoder = new TextDecoder("utf-8");
            setCurrCredID((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["arrayBufferToBase64"])(response.rawId));
            setCurrPublicKey((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["arrayBufferToBase64"])(response.response.getPublicKey()));
            setCurrAlg(response.response.getPublicKeyAlgorithm());
            setCurrJSON(decoder.decode(response.response.clientDataJSON));
            setCurrTransports(response.response.getTransports());
            setDisplaySpinner(false);
            setRegisterNewPasskeyTab(2);
        });
    }
    function finishPasskeyRegistration() {
        let newCredential = {
            'idNum': savedCredentials.length,
            'id': currCredID,
            'publicKey': currPublicKey,
            'clientDataJSON': currJSON,
            'alg': currAlg,
            'transports': currTransports
        };
        let newCredentialsList = [];
        savedCredentials.forEach((item)=>{
            newCredentialsList.push(item);
        });
        newCredentialsList.push(newCredential);
        setSavedCredentials(newCredentialsList);
        setRegisterNewPasskeyTab(0);
        console.log('Saved Creds');
        console.log(savedCredentials);
    }
    function RenderPasskeyRegisterTabPage1() {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Step 1: Generating Passkey From Browser"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 198,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Challenge: "
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 200,
                            columnNumber: 20
                        }, this),
                        challenge,
                        " ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                            variant: "dark",
                            onClick: (event)=>{
                                setChallenge((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["GenerateBase64SecretKey"])());
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                class: "bi bi-arrow-repeat"
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                lineNumber: 200,
                                columnNumber: 136
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 200,
                            columnNumber: 50
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 200,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                    children: "Display Name: "
                                }, void 0, false, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 204,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: fullname,
                                    onChange: (event)=>{
                                        setFullname(event.target.value);
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 204,
                                    columnNumber: 46
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 203,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                    children: "Username: "
                                }, void 0, false, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 207,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: username,
                                    onChange: (event)=>{
                                        setUsername(event.target.value);
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 207,
                                    columnNumber: 42
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 206,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 202,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: "Options provided to browser in navigate.credentials.create()"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 211,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$prism$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Prism$3e$__["Prism"], {
                        language: "javascript",
                        style: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$styles$2f$prism$2f$coldark$2d$dark$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__coldarkDark$3e$__["coldarkDark"],
                        children: '\n                        navigator.credentials.create(\n                            "publicKey": {\n                                "challenge": Uint8Array.from("'.concat(challenge, '"),\n                                "rp": {\n                                    "id": "authfuture.com", \n                                    "name": "AuthFuture"\n                                },\n                                "user": {\n                                    "id": 1,\n                                    "name": "').concat(username, '",\n                                    "displayName": "').concat(fullname, '"\n                                },\n                                "pubKeyCredParams": [ \n                                    {\n                                        "type": "public-key",\n                                        "alg": -7,\n                                    },\n                                    {\n                                        "type": "public-key",\n                                        "alg": -257\n                                    }\n                                ],\n                                "authenticatorSelection": {\n                                    "userVerification": "preferred",\n                                    "requireResidentKey": false\n                                },\n                                "excludeCredentials": ').concat(getCredentialArrayStr(), "\n                            }\n                        )\n                        ")
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 213,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 212,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        flexDirection: 'row',
                        height: '40px',
                        gap: '5px'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                            variant: "danger",
                            onClick: toggleRegisterNewPasskeyTab,
                            children: "Cancel"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 248,
                            columnNumber: 21
                        }, this),
                        " ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                            variant: "success",
                            onClick: (event)=>{
                                registerPasskey();
                            },
                            children: "Register"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 248,
                            columnNumber: 100
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'block',
                                height: '40px',
                                width: '40px'
                            },
                            children: displaySpinner && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                class: "spinner"
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                lineNumber: 250,
                                columnNumber: 45
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 249,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 247,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true);
    }
    function RenderPasskeyRegisterTabPage2() {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    children: "Step 2: Store Attestation Response"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 260,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: "The following Attestation Response is returned from the navigator.credentials.create() function."
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 262,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 262,
                    columnNumber: 126
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$prism$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Prism$3e$__["Prism"], {
                        language: "javascript",
                        style: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$styles$2f$prism$2f$coldark$2d$dark$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__coldarkDark$3e$__["coldarkDark"],
                        children: '\n                        PublicKeyCredential {\n                            id: "'.concat(currCredID, '"\n                            type: "public-key"\n                            authenticatorAttachment: "platform"\n                            response: AuthenticatorAttestationResponse {\n                                AttestationObject: ArrayBuffer()\n                                ClientDataJSON: ArrayBuffer()\n                                getClientDataJSON()\n                                getPublicKeyAlgorithm()\n                                getAlgorithm()\n                                getTransports()\n                            }\n                        }\n                        ')
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 265,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 264,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Credential ID: "
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 285,
                            columnNumber: 23
                        }, this),
                        " ",
                        currCredID
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 285,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 285,
                    columnNumber: 65
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Public Key (Base 64): "
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 287,
                            columnNumber: 23
                        }, this),
                        " ",
                        currPublicKey
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 287,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 287,
                    columnNumber: 75
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Algorithm:"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 289,
                            columnNumber: 23
                        }, this),
                        " ",
                        currAlg
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 289,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 289,
                    columnNumber: 57
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Transports: "
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 291,
                            columnNumber: 23
                        }, this),
                        " ",
                        currTransports
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 291,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 291,
                    columnNumber: 66
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Client Data JSON:"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 293,
                            columnNumber: 23
                        }, this),
                        " "
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 293,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 293,
                    columnNumber: 55
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$prism$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Prism$3e$__["Prism"], {
                        language: "javascript",
                        style: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$styles$2f$prism$2f$coldark$2d$dark$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__coldarkDark$3e$__["coldarkDark"],
                        children: currJSON
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 296,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 295,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        backgroundColor: 'green',
                        border: '1px solid green',
                        borderRadius: '20px',
                        color: '#FFF',
                        display: 'flex',
                        flexDirection: 'row'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                width: '100px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                class: "bi bi-check-circle-fill"
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                lineNumber: 303,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 302,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                flexDirection: 'column'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        children: "Challenge Verified"
                                    }, void 0, false, {
                                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                        lineNumber: 306,
                                        columnNumber: 31
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 306,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                            children: "Challenge:"
                                        }, void 0, false, {
                                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                            lineNumber: 307,
                                            columnNumber: 31
                                        }, this),
                                        " ",
                                        challenge
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 307,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Set challenge matches challenge returned in Client Data JSON"
                                }, void 0, false, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 308,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 305,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 301,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                    variant: "danger",
                    onClick: toggleRegisterNewPasskeyTab,
                    children: "Cancel"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 312,
                    columnNumber: 17
                }, this),
                " ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                    variant: "success",
                    onClick: (event)=>{
                        finishPasskeyRegistration();
                    },
                    children: "Finish"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 312,
                    columnNumber: 96
                }, this)
            ]
        }, void 0, true);
    }
    function passkeyTabTitle() {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: "passkey-tab-title",
                style: {
                    color: '#FFF',
                    backgroundColor: '#2a2a2a'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Create New Passkey"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 320,
                    columnNumber: 97
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                lineNumber: 320,
                columnNumber: 17
            }, this)
        }, void 0, false);
    }
    function renderPasskeyRegisterTab() {
        if (registerNewPasskeyTab === 1) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    passkeyTabTitle(),
                    RenderPasskeyRegisterTabPage1()
                ]
            }, void 0, true);
        } else if (registerNewPasskeyTab === 2) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    passkeyTabTitle(),
                    RenderPasskeyRegisterTabPage2()
                ]
            }, void 0, true);
        }
    }
    // --------------------------------------------------------------------------------------------------
    /* Verify Passkey */ function verificationCalculations() {
        let settings = {
            'id': assertionData.id,
            'clientDataJSON': assertionData.clientDataJSON,
            'authenticatorData': assertionData.authenticatorData,
            'publicKey': getPublicKey(assertionData.id)['publicKey'],
            'signature': assertionData.signature,
            'sha256': '',
            'authenticatorJSONCombined': '',
            'verified': ''
        };
        console.log('--------------------------------');
        //Hash
        let hash = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$crypto$2d$js$2f$sha256$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"])(window.atob(settings.clientDataJSON));
        settings.sha256 = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$crypto$2d$js$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["enc"].Base64.stringify(hash);
        //AuthData + SHA256(ClientDataJSON)
        settings.authenticatorJSONCombined = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$concat$2d$array$2d$buffers$2e$js__$5b$client$5d$__$28$ecmascript$29$__["concatArrayBuffers"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Base64Binary"].decode(settings.authenticatorData), __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Base64Binary"].decode(settings.sha256));
        let publicKeyRaw = __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Base64Binary"].decode(settings.publicKey);
        console.log('Public Key');
        console.log(settings.publicKey);
        let signatureRaw = __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Base64Binary"].decode(settings.signature);
        console.log('Signature');
        console.log(settings.signature);
        console.log('Client Data JSON');
        console.log(settings.clientDataJSON);
        console.log('SHA(ClientDataJSON)');
        console.log(settings.sha256);
        let authenticatorDataJSONRaw = __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Base64Binary"].decode(settings.authenticatorJSONCombined);
        console.log('Authenticator + SHA(JSON) ');
        console.log(settings.authenticatorJSONCombined);
        console.log('------------------------------');
        if (getAlgoDetails(assertionData.id).algoName == 'RS256') {
            // (-257) RS256: RSASSA-PKCS1-v1_5 using SHA-256  
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$webauthn$2d$verification$2d$algos$2e$js__$5b$client$5d$__$28$ecmascript$29$__["verifyRS256"])(publicKeyRaw, signatureRaw, authenticatorDataJSONRaw, setAssertionVerified);
        } else if (getAlgoDetails(assertionData.id).algoName == 'ES256') {
            // (-7) ES256: ECDSA w/ SHA-256
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$webauthn$2d$verification$2d$algos$2e$js__$5b$client$5d$__$28$ecmascript$29$__["verifyES256"])(publicKeyRaw, signatureRaw, authenticatorDataJSONRaw, setAssertionVerified);
        }
        setValidationCalculations(settings);
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WebAuthnTool.useEffect": ()=>{
            if (assertionData.id.length > 0) {
                verificationCalculations();
            }
        }
    }["WebAuthnTool.useEffect"], [
        assertionData
    ]);
    function getCredentialArray() {
        let creds = [];
        savedCredentials.forEach((cred)=>{
            creds.push({
                'id': __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Base64Binary"].decode(cred.id),
                'type': 'public-key',
                'transports': cred.transports
            });
        });
        return creds;
    }
    function getCredentialArrayStr() {
        let creds = [];
        savedCredentials.forEach((cred)=>{
            creds.push({
                'id': cred.id,
                'type': 'public-key',
                'transports': cred.transports
            });
        });
        return JSON.stringify(creds, null, 20);
    }
    function verifyPasskey() {
        let options = {
            "publicKey": {
                "challenge": __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Base64Binary"].decode(challenge),
                "rpId": window.location.hostname,
                "allowCredentials": getCredentialArray(),
                "userVerification": "preferred"
            }
        };
        if (passwordlessMode) {
            options = {
                "publicKey": {
                    "challenge": __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Base64Binary"].decode(challenge),
                    "rpId": window.location.hostname,
                    "userVerification": "preferred"
                }
            };
        }
        setDisplaySpinner(true);
        navigator.credentials.get(options).then((response)=>{
            console.log('Assertion');
            console.log(response);
            setAssertionData({
                "id": (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["arrayBufferToBase64"])(response.rawId),
                "authenticatorData": (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["arrayBufferToBase64"])(response.response.authenticatorData),
                "clientDataJSON": (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["arrayBufferToBase64"])(response.response.clientDataJSON),
                "signature": (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["arrayBufferToBase64"])(response.response.signature),
                "userHandle": (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["arrayBufferToBase64"])(response.response.userHandle)
            });
            setDisplaySpinner(false);
            setLoginWithPasskeyTab(2);
        //verificationCalculations()
        });
    }
    function renderPasskeyLoginTabPage1() {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Step 1: Get Passkey Assertion"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 487,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Challenge: "
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 489,
                            columnNumber: 20
                        }, this),
                        challenge,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                            variant: "dark",
                            onClick: (event)=>{
                                setChallenge((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$base64$2e$js__$5b$client$5d$__$28$ecmascript$29$__["GenerateBase64SecretKey"])());
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                class: "bi bi-arrow-repeat"
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                lineNumber: 489,
                                columnNumber: 135
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 489,
                            columnNumber: 49
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 489,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "checkbox",
                                name: "passwordlessMode",
                                checked: passwordlessMode,
                                onChange: (event)=>{
                                    setPasswordlessMode(event.target.checked);
                                }
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                lineNumber: 491,
                                columnNumber: 27
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                children: " Enable Passwordless Mode"
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                lineNumber: 491,
                                columnNumber: 168
                            }, this),
                            " (Not available for passkeys with external/non-resident authenticators)"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 491,
                        columnNumber: 20
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 491,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: "Options provided to browser in navigate.credentials.get()"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 493,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$prism$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Prism$3e$__["Prism"], {
                        language: "javascript",
                        style: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$styles$2f$prism$2f$coldark$2d$dark$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__coldarkDark$3e$__["coldarkDark"],
                        children: "\n                        ".concat((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$verification$2d$methods$2d$code$2d$string$2e$js__$5b$client$5d$__$28$ecmascript$29$__["renderLoginRetrievalJSON"])(passwordlessMode, challenge, savedCredentials), "\n                        ")
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 495,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 494,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        flexDirection: 'row',
                        height: '40px',
                        gap: '5px'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                            variant: "danger",
                            onClick: togglePasskeyLoginTab,
                            children: "Cancel"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 502,
                            columnNumber: 21
                        }, this),
                        " ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                            variant: "success",
                            onClick: (event)=>{
                                verifyPasskey();
                            },
                            children: "Verify"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 502,
                            columnNumber: 94
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'block',
                                height: '40px',
                                width: '40px'
                            },
                            children: displaySpinner && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                class: "spinner"
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                lineNumber: 504,
                                columnNumber: 45
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 503,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 501,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true);
    }
    function renderPasskeyLoginTabPage2() {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Step 2: Assertion Response"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 517,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$prism$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Prism$3e$__["Prism"], {
                        language: "javascript",
                        style: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$styles$2f$prism$2f$coldark$2d$dark$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__coldarkDark$3e$__["coldarkDark"],
                        children: '\n                        PublicKeyCredential {\n                            "type": "public-key",\n                            "authenticatorAttachment": "platform",\n                            "id": "'.concat(assertionData.id, '",\n                            "rawId": ArrayBuffer\n                            "response": AuthenticatorAssertionResponse {\n                                "authenticatorData": ArrayBuffer\n                                "clientDataJSON": ArrayBuffer\n                                "signature": ArrayBuffer\n                                "userHandle": ArrayBuffer\n                            }\n                        }\n                        ')
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 520,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 519,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Assertion Credential ID: "
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 538,
                            columnNumber: 23
                        }, this),
                        " ",
                        assertionData.id
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 538,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 538,
                    columnNumber: 81
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Authenticator Data:"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 540,
                            columnNumber: 23
                        }, this),
                        " ",
                        assertionData.authenticatorData
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 540,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 540,
                    columnNumber: 90
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Assertion Signature:"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 542,
                            columnNumber: 20
                        }, this),
                        " ",
                        assertionData.signature
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 542,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 542,
                    columnNumber: 77
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Client Data JSON: "
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 544,
                            columnNumber: 23
                        }, this),
                        " ",
                        assertionData.clientDataJSON
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 544,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 544,
                    columnNumber: 86
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "SHA256(ClientDataJSON): "
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 545,
                            columnNumber: 23
                        }, this),
                        " ",
                        validationCalculations.sha256
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 545,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$prism$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Prism$3e$__["Prism"], {
                        language: "javascript",
                        style: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$styles$2f$prism$2f$coldark$2d$dark$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__coldarkDark$3e$__["coldarkDark"],
                        children: "\n                        ".concat(window.atob(assertionData.clientDataJSON), "\n                        ")
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 548,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 547,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        backgroundColor: 'green',
                        border: '1px solid green',
                        borderRadius: '20px',
                        color: '#FFF',
                        display: 'flex',
                        flexDirection: 'row'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                width: '100px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                class: "bi bi-check-circle-fill"
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                lineNumber: 559,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 558,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                flexDirection: 'column'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        children: "Challenge Verified"
                                    }, void 0, false, {
                                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                        lineNumber: 562,
                                        columnNumber: 31
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 562,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                            children: "Challenge:"
                                        }, void 0, false, {
                                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                            lineNumber: 563,
                                            columnNumber: 31
                                        }, this),
                                        " ",
                                        challenge
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 563,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Set challenge matches challenge returned in Client Data JSON. Prevents replay attacks."
                                }, void 0, false, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 564,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 561,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 557,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                    variant: "danger",
                    onClick: togglePasskeyLoginTab,
                    children: "Cancel"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 568,
                    columnNumber: 17
                }, this),
                " ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                    variant: "success",
                    onClick: (event)=>{
                        setLoginWithPasskeyTab(3);
                    },
                    children: "Next"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 568,
                    columnNumber: 90
                }, this)
            ]
        }, void 0, true);
    }
    function getAlgoDetails(id) {
        let output = {
            'algoNum': -7,
            'algoName': 'ES256'
        };
        savedCredentials.forEach((cred)=>{
            if (cred.id === id) {
                output.algoNum = cred.alg;
                if (output.algoNum === -7) {
                    output.algoName = 'ES256';
                } else if (output.algoNum === -257) {
                    output.algoName = 'RS256';
                }
            }
        });
        return output;
    }
    function getPublicKey(id) {
        let output = {
            'publicKey': ""
        };
        savedCredentials.forEach((cred)=>{
            if (cred.id === id) {
                output.publicKey = cred.publicKey;
            }
        });
        return output;
    }
    function getSavedCred(id) {
        let output = {
            'publicKey': ""
        };
        savedCredentials.forEach((cred)=>{
            if (cred.id === id) {
                output = cred;
            }
        });
        return output;
    }
    function renderPasskeyLoginTabPage3() {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Step 3: Import Public Key of Matched Passkey"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 629,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Assertion Credential ID:"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 631,
                            columnNumber: 20
                        }, this),
                        " ",
                        assertionData.id
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 631,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        backgroundColor: 'green',
                        border: '1px solid green',
                        borderRadius: '20px',
                        color: '#FFF',
                        display: 'flex',
                        flexDirection: 'row'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                width: '100px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                class: "bi bi-check-circle-fill"
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                lineNumber: 635,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 634,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                flexDirection: 'column'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        children: [
                                            "Assertion Credential ID Matched with Passkey #",
                                            getSavedCred(assertionData.id).idNum
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                        lineNumber: 638,
                                        columnNumber: 31
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 638,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                            children: [
                                                "Passkey #",
                                                getSavedCred(assertionData.id).idNum,
                                                " Credential ID:"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                            lineNumber: 639,
                                            columnNumber: 31
                                        }, this),
                                        " ",
                                        assertionData.id
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 639,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 637,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 633,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: [
                                "Passkey #",
                                getSavedCred(assertionData.id).idNum,
                                " Public Key: "
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 643,
                            columnNumber: 20
                        }, this),
                        " ",
                        getPublicKey(assertionData.id)['publicKey'],
                        " "
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 643,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$prism$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Prism$3e$__["Prism"], {
                        language: "javascript",
                        style: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$styles$2f$prism$2f$coldark$2d$dark$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__coldarkDark$3e$__["coldarkDark"],
                        children: "\n                        ".concat((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$verification$2d$methods$2d$code$2d$string$2e$js__$5b$client$5d$__$28$ecmascript$29$__["renderLoginPublicKeyJSON"])(assertionData, savedCredentials), "\n                        ")
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 645,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 644,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 651,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 652,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 654,
                    columnNumber: 16
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                    variant: "danger",
                    onClick: togglePasskeyLoginTab,
                    children: "Cancel"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 656,
                    columnNumber: 17
                }, this),
                " ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                    variant: "success",
                    onClick: (event)=>{
                        setLoginWithPasskeyTab(4);
                    },
                    children: "Verify"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 656,
                    columnNumber: 90
                }, this)
            ]
        }, void 0, true);
    }
    function renderPasskeyLoginTabPage4() {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Step 4: Verification"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 665,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Algorithm:"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 667,
                            columnNumber: 20
                        }, this),
                        " ",
                        getAlgoDetails(assertionData.id)['algoName']
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 667,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: [
                                "Passkey #",
                                getSavedCred(assertionData.id).idNum,
                                " Public Key: "
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 668,
                            columnNumber: 20
                        }, this),
                        " ",
                        getPublicKey(assertionData.id)['publicKey'],
                        " "
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 668,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Authenticator Data + SHA256(ClientDataJSON):"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 669,
                            columnNumber: 20
                        }, this),
                        " ",
                        validationCalculations.authenticatorJSONCombined
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 669,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                            children: "Assertion Signature:"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 670,
                            columnNumber: 20
                        }, this),
                        " ",
                        validationCalculations.signature
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 670,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$prism$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Prism$3e$__["Prism"], {
                        language: "javascript",
                        style: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$syntax$2d$highlighter$2f$dist$2f$esm$2f$styles$2f$prism$2f$coldark$2d$dark$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__coldarkDark$3e$__["coldarkDark"],
                        children: "\n                        ".concat((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$verification$2d$methods$2d$code$2d$string$2e$js__$5b$client$5d$__$28$ecmascript$29$__["renderLoginVerifyJSON"])(assertionData, savedCredentials), "\n                        ")
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 673,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 672,
                    columnNumber: 17
                }, this),
                assertionVerified && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        backgroundColor: 'green',
                        border: '1px solid green',
                        borderRadius: '20px',
                        color: '#FFF',
                        display: 'flex',
                        flexDirection: 'row'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                width: '100px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                class: "bi bi-check-circle-fill"
                            }, void 0, false, {
                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                lineNumber: 682,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 681,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: 'flex',
                                flexDirection: 'column'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        children: "Passkey Login Successful - Assertion Verified"
                                    }, void 0, false, {
                                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                        lineNumber: 685,
                                        columnNumber: 31
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 685,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                            children: "Assertion Signature"
                                        }, void 0, false, {
                                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                            lineNumber: 686,
                                            columnNumber: 31
                                        }, this),
                                        " decrypted with ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                            children: [
                                                "Passkey #",
                                                getSavedCred(assertionData.id).idNum,
                                                " Public Key"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                            lineNumber: 686,
                                            columnNumber: 73
                                        }, this),
                                        " using ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                            children: getAlgoDetails(assertionData.id)['algoName']
                                        }, void 0, false, {
                                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                            lineNumber: 686,
                                            columnNumber: 145
                                        }, this),
                                        " = SHA-256 Hash of ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("b", {
                                            children: "AuthenticatorData + SHA256(ClientDataJSON)"
                                        }, void 0, false, {
                                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                            lineNumber: 686,
                                            columnNumber: 217
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 686,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 684,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 680,
                    columnNumber: 17
                }, this),
                !assertionVerified && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "alert alert-danger d-flex align-items-center",
                    role: "alert",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                            className: "bi bi-exclamation-triangle-fill me-2"
                        }, void 0, false, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 692,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h5", {
                                    className: "mb-1",
                                    children: "Passkey Login Failed - Assertion Not Verified"
                                }, void 0, false, {
                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                    lineNumber: 694,
                                    columnNumber: 29
                                }, this),
                                "The signature could not be verified. Please try again or register a new passkey."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                            lineNumber: 693,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 691,
                    columnNumber: 21
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                    variant: "danger",
                    onClick: togglePasskeyLoginTab,
                    children: "Cancel"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 700,
                    columnNumber: 17
                }, this),
                " ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                    variant: "success",
                    onClick: (event)=>{
                        setAssertionVerified(false);
                        setLoginWithPasskeyTab(0);
                    },
                    children: "Finish"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 700,
                    columnNumber: 90
                }, this)
            ]
        }, void 0, true);
    }
    function passkeyVerifyTabTitle() {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: "passkey-tab-title",
                style: {
                    color: '#FFF',
                    backgroundColor: '#2a2a2a'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    children: "Verify Passkey"
                }, void 0, false, {
                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                    lineNumber: 712,
                    columnNumber: 97
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                lineNumber: 712,
                columnNumber: 17
            }, this)
        }, void 0, false);
    }
    function renderLoginPasskeyTab() {
        if (loginWithPasskeyTab === 1) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    passkeyVerifyTabTitle(),
                    renderPasskeyLoginTabPage1()
                ]
            }, void 0, true);
        } else if (loginWithPasskeyTab === 2) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    passkeyVerifyTabTitle(),
                    renderPasskeyLoginTabPage2()
                ]
            }, void 0, true);
        } else if (loginWithPasskeyTab === 3) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    passkeyVerifyTabTitle(),
                    renderPasskeyLoginTabPage3()
                ]
            }, void 0, true);
        } else if (loginWithPasskeyTab === 4) {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    passkeyVerifyTabTitle(),
                    renderPasskeyLoginTabPage4()
                ]
            }, void 0, true);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
            style: {
                backgroundColor: '#f1f1f1',
                color: '#000',
                paddingTop: '10px',
                paddingBottom: '30px'
            },
            id: "webauthn-section",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Container$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Container$3e$__["Container"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "stylesheet",
                        href: "/css/webauthn-tool.css"
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 755,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        children: "WebAuthn Passkeys"
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 757,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        id: "webauthn-explanation-container",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$WebAuthnGraph$2e$js__$5b$client$5d$__$28$ecmascript$29$__["PasskeyExplanation"])()
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 758,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        children: "Passkeys Demo"
                    }, void 0, false, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 762,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        id: "webauthn-tool-container",
                        style: {},
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                id: "webauthn-register",
                                style: {
                                    borderBottom: '1px solid #000'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                class: "bi bi-sliders"
                                            }, void 0, false, {
                                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                                lineNumber: 768,
                                                columnNumber: 29
                                            }, this),
                                            " Configure Passkeys"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                        lineNumber: 768,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                id: "passkey-list",
                                                style: {
                                                    paddingBottom: '20px'
                                                },
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$utilities$2f$list$2d$registered$2d$passkeys$2e$js__$5b$client$5d$__$28$ecmascript$29$__["RenderListRegisteredPasskeys"])(savedCredentials)
                                            }, void 0, false, {
                                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                                lineNumber: 771,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                id: "passkey-register-tab",
                                                style: {
                                                    backgroundColor: 'transparent'
                                                },
                                                children: renderPasskeyRegisterTab()
                                            }, void 0, false, {
                                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                                lineNumber: 774,
                                                columnNumber: 29
                                            }, this),
                                            (()=>{
                                                if (registerNewPasskeyTab) {
                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {}, void 0, false);
                                                } else {
                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                                        variant: "dark",
                                                        onClick: toggleRegisterNewPasskeyTab,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                class: "bi bi-plus-circle"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                                                lineNumber: 785,
                                                                columnNumber: 102
                                                            }, this),
                                                            " Add New Passkey"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                                        lineNumber: 785,
                                                        columnNumber: 41
                                                    }, this);
                                                }
                                            })()
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                        lineNumber: 770,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                lineNumber: 767,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                id: "webauthn-login",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                class: "bi bi-box-arrow-in-right"
                                            }, void 0, false, {
                                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                                lineNumber: 794,
                                                columnNumber: 29
                                            }, this),
                                            " Login with Passkey"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                        lineNumber: 794,
                                        columnNumber: 25
                                    }, this),
                                    renderLoginPasskeyTab(),
                                    (()=>{
                                        if (loginWithPasskeyTab === 0) {
                                            if (savedCredentials.length > 0) {
                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                                    onClick: togglePasskeyLoginTab,
                                                    variant: "dark",
                                                    children: "Start"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                                    lineNumber: 802,
                                                    columnNumber: 37
                                                }, this);
                                            } else {
                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        style: {
                                                            display: 'flex',
                                                            flexDirection: 'column'
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                style: {
                                                                    color: 'red',
                                                                    fontSize: '18px'
                                                                },
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {
                                                                        class: "bi bi-exclamation-circle"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                                                        lineNumber: 808,
                                                                        columnNumber: 96
                                                                    }, this),
                                                                    " No passkeys configured"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                                                lineNumber: 808,
                                                                columnNumber: 49
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$bootstrap$2f$esm$2f$Button$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Button$3e$__["Button"], {
                                                                    variant: "dark",
                                                                    disabled: true,
                                                                    children: "Start"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                                                    lineNumber: 809,
                                                                    columnNumber: 54
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                                                lineNumber: 809,
                                                                columnNumber: 49
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                                        lineNumber: 807,
                                                        columnNumber: 45
                                                    }, this)
                                                }, void 0, false);
                                            }
                                        }
                                    })()
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                                lineNumber: 793,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                        lineNumber: 764,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
                lineNumber: 754,
                columnNumber: 13
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/WebAuthn-Tool/WebAuthn-Tool.js",
            lineNumber: 753,
            columnNumber: 9
        }, this)
    }, void 0, false);
}
_s(WebAuthnTool, "ASJlWlJo5QnMJiiC6wD79i738FQ=");
_c = WebAuthnTool;
var _c;
__turbopack_context__.k.register(_c, "WebAuthnTool");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/index.ts [client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$FeatureImage$2f$FeatureImage$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/FeatureImage/FeatureImage.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Footer$2f$Footer$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/Footer/Footer.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$NavigationBar$2f$NavigationBar$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/NavigationBar/NavigationBar.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TOTP$2d$Tool$2f$TOTP$2d$Tool$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/TOTP-Tool/TOTP-Tool.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$WebAuthn$2d$Tool$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/WebAuthn-Tool.js [client] (ecmascript)");
;
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/FeatureImage/FeatureImage.js [client] (ecmascript) <export default as FeatureImage>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FeatureImage",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$FeatureImage$2f$FeatureImage$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$FeatureImage$2f$FeatureImage$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/FeatureImage/FeatureImage.js [client] (ecmascript)");
}),
"[project]/components/WebAuthn-Tool/WebAuthn-Tool.js [client] (ecmascript) <export default as WebAuthnTool>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WebAuthnTool",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$WebAuthn$2d$Tool$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$WebAuthn$2d$Tool$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/WebAuthn-Tool.js [client] (ecmascript)");
}),
"[project]/pages/index.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$index$2e$ts__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/index.ts [client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$FeatureImage$2f$FeatureImage$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FeatureImage$3e$__ = __turbopack_context__.i("[project]/components/FeatureImage/FeatureImage.js [client] (ecmascript) <export default as FeatureImage>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$WebAuthn$2d$Tool$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__WebAuthnTool$3e$__ = __turbopack_context__.i("[project]/components/WebAuthn-Tool/WebAuthn-Tool.js [client] (ecmascript) <export default as WebAuthnTool>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dynamic$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dynamic.js [client] (ecmascript)");
;
;
;
;
const TOTPTool = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dynamic$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"])(()=>__turbopack_context__.A("[project]/components/TOTP-Tool/TOTP-Tool.js [client] (ecmascript, next/dynamic entry, async loader)"), {
    loadableGenerated: {
        modules: [
            "[project]/components/TOTP-Tool/TOTP-Tool.js [client] (ecmascript, next/dynamic entry)"
        ]
    },
    ssr: false
});
_c = TOTPTool;
function Home() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$FeatureImage$2f$FeatureImage$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FeatureImage$3e$__["FeatureImage"], {}, void 0, false, {
                    fileName: "[project]/pages/index.tsx",
                    lineNumber: 11,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/pages/index.tsx",
                lineNumber: 10,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$WebAuthn$2d$Tool$2f$WebAuthn$2d$Tool$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__WebAuthnTool$3e$__["WebAuthnTool"], {}, void 0, false, {
                    fileName: "[project]/pages/index.tsx",
                    lineNumber: 14,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/pages/index.tsx",
                lineNumber: 13,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(TOTPTool, {}, void 0, false, {
                    fileName: "[project]/pages/index.tsx",
                    lineNumber: 17,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/pages/index.tsx",
                lineNumber: 16,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true);
}
_c1 = Home;
var _c, _c1;
__turbopack_context__.k.register(_c, "TOTPTool");
__turbopack_context__.k.register(_c1, "Home");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/pages/index.tsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/pages/index.tsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/pages/index\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/pages/index.tsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__caceb675._.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityOrchestrator = void 0;
function now() {
    return Date.now();
}
class CapabilityOrchestrator {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async runCapability(args) {
        const projectId = String(args.projectId);
        const nodeId = String(args.nodeId);
        const capabilityId = String(args.capabilityId);
        const mode = args.mode ?? 'run';
        const runId = this.deps.runRepo.createRun({
            projectId,
            kind: `capability:${capabilityId}:${mode}`,
            inputJson: {
                projectId,
                nodeId,
                capabilityId,
                mode,
                instruction: args.instruction ?? null,
                baseVersionId: args.baseVersionId ?? null,
                directContent: args.directContent ?? null
            }
        });
        const emitEvent = (type, payloadJson) => {
            try {
                this.deps.runRepo.addEvent({ runId, type, payloadJson });
            }
            catch {
                // best-effort; do not fail the run if tracing fails
            }
            try {
                this.deps.eventBus?.emit(type, payloadJson);
            }
            catch {
                // best-effort
            }
        };
        emitEvent('run:start', { ts: now(), projectId, nodeId, capabilityId, runId });
        try {
            await this.deps.nodeTree.updateNode({ projectId, nodeId, status: 'running' });
            const capability = this.deps.capabilityRegistry.get(capabilityId);
            if (!capability) {
                throw new Error(`Unknown capability: ${capabilityId}`);
            }
            const buildMeta = (extra) => {
                const merged = { ...(args.meta ?? {}) };
                if (args.mode === 'redo' && args.baseVersionId)
                    merged.baseVersionId = String(args.baseVersionId);
                if (args.instruction && typeof merged.promptSummary !== 'string') {
                    merged.promptSummary = String(args.instruction).slice(0, 200);
                }
                if (extra)
                    merged.extra = { ...(merged.extra ?? {}), ...extra };
                return merged;
            };
            const inferContent = (data) => {
                if (capabilityId === 'image') {
                    const u = String(data ?? '').trim();
                    if (!u)
                        throw new Error('image contentUrl is empty');
                    return { contentType: 'image', contentUrl: u, contentText: null, contentJson: undefined };
                }
                if (typeof data === 'string') {
                    return { contentType: 'text', contentText: data, contentJson: undefined, contentUrl: null };
                }
                return { contentType: 'json', contentJson: data ?? null, contentText: null, contentUrl: null };
            };
            const readBaselineData = async () => {
                if (args.baseVersionId) {
                    const base = await this.deps.artifactStore.getVersionById({
                        projectId,
                        nodeId,
                        capabilityId,
                        versionId: String(args.baseVersionId)
                    });
                    if (!base)
                        throw new Error('baseVersionId not found');
                    if (base.contentType === 'json')
                        return base.contentJson;
                    if (base.contentType === 'image')
                        return base.contentUrl;
                    return base.contentText;
                }
                const adopted = await this.deps.artifactStore.getAdopted({ projectId, nodeId, capabilityId });
                if (!adopted)
                    return capability.schema?.defaultData ?? null;
                if (adopted.contentType === 'json')
                    return adopted.contentJson;
                if (adopted.contentType === 'image')
                    return adopted.contentUrl;
                return adopted.contentText;
            };
            // Strategy 1: directContent (explicit write)
            const contentFromDirect = args.directContent
                ? {
                    contentType: args.directContent.contentType,
                    contentText: args.directContent.contentText ?? null,
                    contentJson: args.directContent.contentJson,
                    contentUrl: args.directContent.contentUrl ?? null
                }
                : null;
            // Strategy 2: operation facet (pure computation)
            const contentFromOperation = !contentFromDirect && args.operation ? await (async () => {
                if (!capability.operation)
                    throw new Error(`Capability ${capabilityId} does not support operation facet`);
                const currentData = await readBaselineData();
                const nextData = await capability.operation.execute(String(args.operation), args.operationArgs ?? {}, currentData);
                return inferContent(nextData);
            })() : null;
            const content = contentFromDirect || contentFromOperation;
            if (!content) {
                throw new Error('runCapability requires directContent or operation in current implementation');
            }
            const toValidate = content.contentType === 'json' ? content.contentJson : content.contentType === 'image' ? content.contentUrl : content.contentText;
            const ok = capability.schema?.validate?.(toValidate);
            if (ok === false)
                throw new Error('Schema validation failed');
            const created = await this.deps.artifactStore.appendVersion({
                projectId,
                nodeId,
                capabilityId,
                contentType: content.contentType,
                contentText: content.contentText ?? null,
                contentJson: content.contentJson,
                contentUrl: content.contentUrl ?? null,
                meta: buildMeta({
                    mode,
                    operation: args.operation ? String(args.operation) : undefined
                }),
                adopt: args.adopt !== false
            });
            emitEvent('artifact:appended', {
                ts: now(),
                projectId,
                nodeId,
                capabilityId,
                runId,
                artifactId: created.artifactId,
                versionId: created.id,
                versionIndex: created.versionIndex
            });
            if (args.adopt !== false) {
                emitEvent('artifact:adopted', {
                    ts: now(),
                    projectId,
                    nodeId,
                    capabilityId,
                    runId,
                    artifactId: created.artifactId,
                    versionId: created.id,
                    versionIndex: created.versionIndex
                });
                emitEvent('data:changed', {
                    ts: now(),
                    projectId,
                    nodeId,
                    capabilityId,
                    runId,
                    artifactId: created.artifactId,
                    versionId: created.id,
                    versionIndex: created.versionIndex
                });
            }
            await this.deps.nodeTree.updateNode({ projectId, nodeId, status: 'succeeded' });
            this.deps.runRepo.setRunStatus({ runId, status: 'succeeded' });
            emitEvent('run:succeeded', { ts: now(), projectId, nodeId, capabilityId, runId });
            return {
                ok: true,
                runId,
                projectId,
                nodeId,
                capabilityId,
                versionId: created.id,
                artifactId: created.artifactId,
                versionIndex: created.versionIndex
            };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await this.deps.nodeTree.updateNode({ projectId, nodeId, status: 'failed' });
            this.deps.runRepo.setRunStatus({ runId, status: 'failed', error: msg });
            emitEvent('run:failed', { ts: now(), projectId, nodeId, capabilityId, runId, error: msg });
            throw e;
        }
    }
}
exports.CapabilityOrchestrator = CapabilityOrchestrator;

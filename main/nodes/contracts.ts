import type { NodeKind } from '../pipeline/contracts'
import type { MemoStore } from '../memo/memoStore'
import type { LlmService } from '../services/llmService'

export type NodeUiBlockType = 'memo' | 'kv' | 'sandbox' | 'storyboard' | 'image'

export type NodeUiBlock = {
    type: NodeUiBlockType
    title: string
}

export type NodeUiSpec = {
    blocks: NodeUiBlock[]
}

export type NodeSeedContext = {
    projectId: string
    stepId: string
    title: string
}

export type NodeRunContext = {
    runId: string
    projectId: string
    stepId: string
    title: string
    memoStore: MemoStore
    llm: LlmService
    baseVersionId?: string
}

export type NodeRunInput = {
    mode?: 'run' | 'redo'
    /** use a specific version as baseline (for redo) */
    baseVersionId?: string
    /** human instruction for this step */
    instruction?: string
    /** if provided, node should treat as full content to save */
    contentText?: string
    /** if provided, node should treat as full JSON content to save */
    contentJson?: any
}

export type NodeRunResult =
    | {
        kind: 'memo'
        contentText: string
    }
    | {
        kind: 'kv'
        contentJson: any
    }

export interface NodeHandler<TParams extends Record<string, any> = Record<string, any>> {
    /** Unique node type id, e.g. memo.world */
    type: string
    kind: NodeKind

    /** UI composition hint: which panels should renderer show for this step */
    ui: NodeUiSpec

    /**
     * 在创建项目时为该 step 做初始化（比如创建 artifact、初始版本等）。
     * MVP：只做 seed；后续 run/redo 会走 PipelineRunner。
     */
    seed?(ctx: NodeSeedContext, params?: TParams): void

    /** Execute this node for a step. Should be deterministic given inputs (plus LLM provider). */
    run(ctx: NodeRunContext, input: NodeRunInput, params?: TParams): Promise<NodeRunResult>
}

export interface NodeRegistry {
    get(type: string): NodeHandler
    list(): NodeHandler[]
}

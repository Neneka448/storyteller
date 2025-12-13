export type NodeKind = string

export type PipelineStepDef<TParams extends Record<string, any> = Record<string, any>> = {
    stepId: string
    title: string
    node: import('../nodes/contracts').NodeHandler<TParams>
    params?: TParams
    // 用于 UI 的默认摘要
    initialArtifactSummary: string
}

export type PipelineDef = {
    id: string
    title: string
    steps: PipelineStepDef[]
}

export interface Pipeline {
    definition(): PipelineDef
}

export interface PipelineRegistry {
    get(id: string): Pipeline
    list(): Pipeline[]
}

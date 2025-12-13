import type { CapabilityId, NodeId, ProjectId } from './ids'
import type { EventBus } from './events'
import type { VersionedArtifactStore } from './artifacts'
import type { NodeTreeRepository } from './node'

export type JsonSchema = Record<string, any>

export interface SchemaProvider<TData> {
    defaultData: TData
    validate(data: unknown): boolean
    getJsonSchema(): JsonSchema
}

export interface RenderableFacet {
    componentName: string
    uiOptions?: Record<string, any>
}

export type AgentToolDefinition = {
    name: string
    description: string
    schema: JsonSchema
}

export type ToolContext = {
    projectId: ProjectId
    nodeId: NodeId
    capabilityId: CapabilityId
    runId?: string
    streamId?: string

    // Injected core services for tool execution
    artifacts: VersionedArtifactStore
    nodeTree: NodeTreeRepository
    events: EventBus
}

export interface AgentToolProvider {
    getTools(): AgentToolDefinition[]
    invokeTool(toolName: string, args: any, ctx: ToolContext): Promise<any>
}

export interface OperatableFacet<TData> {
    execute(operation: string, args: any, currentData: TData): Promise<TData>
}

export type CapabilityContext<TConfig = any> = {
    projectId: ProjectId
    nodeId: NodeId
    capabilityId: CapabilityId
    config: TConfig
    events: EventBus
    artifacts: VersionedArtifactStore
    getSiblingData<T = any>(capabilityId: CapabilityId): Promise<T | null>
}

export interface NodeCapability<TData = any, TConfig = any> {
    id: CapabilityId
    schema: SchemaProvider<TData>
    render?: RenderableFacet
    agent?: AgentToolProvider
    operation?: OperatableFacet<TData>

    onMount?(ctx: CapabilityContext<TConfig>): void
    onUnmount?(ctx: CapabilityContext<TConfig>): void
}

export interface CapabilityRegistry {
    register(capability: NodeCapability): void
    registerFactory(id: CapabilityId, factory: () => NodeCapability): void
    get(id: CapabilityId): NodeCapability | null
    list(): NodeCapability[]
    listIds(): CapabilityId[]
}

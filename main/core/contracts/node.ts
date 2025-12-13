import type { CapabilityId, NodeId, ProjectId } from './ids'

export type NodeType = string

export type NodeStatus = 'idle' | 'running' | 'succeeded' | 'failed'

export interface NodeEntity {
    id: NodeId
    projectId: ProjectId
    parentId: NodeId | null
    orderIndex: number
    title: string
    type: NodeType
    capabilities: CapabilityId[]
    status: NodeStatus
    createdAt: number
    updatedAt: number
}

export interface NodeTreeRepository {
    listChildren(args: { projectId: ProjectId; parentId: NodeId | null }): Promise<NodeEntity[]>

    getById(args: { projectId: ProjectId; nodeId: NodeId }): Promise<NodeEntity | null>

    createNode(args: {
        projectId: ProjectId
        parentId: NodeId | null
        title: string
        type: NodeType
        capabilities?: CapabilityId[]
        orderIndex?: number
        status?: NodeStatus
    }): Promise<NodeEntity>

    moveNode(args: {
        projectId: ProjectId
        nodeId: NodeId
        newParentId: NodeId | null
        newOrderIndex: number
    }): Promise<{ ok: true }>

    updateNode(args: {
        projectId: ProjectId
        nodeId: NodeId
        title?: string
        type?: NodeType
        capabilities?: CapabilityId[]
        status?: NodeStatus
    }): Promise<NodeEntity>

    deleteNode(args: { projectId: ProjectId; nodeId: NodeId }): Promise<{ ok: true }>
}

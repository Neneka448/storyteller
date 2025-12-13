import type { ArtifactId, ArtifactVersionId, CapabilityId, NodeId, ProjectId } from './ids'

export type ArtifactContentType = 'text' | 'json' | 'image'

export type ArtifactAuthor = 'user' | 'agent' | 'system'

export type ArtifactMeta = {
    author: ArtifactAuthor
    createdAt?: number
    promptSummary?: string
    baseVersionId?: ArtifactVersionId
    extra?: any
}

export interface Artifact {
    id: ArtifactId
    projectId: ProjectId
    nodeId: NodeId
    capabilityId: CapabilityId
    type: ArtifactContentType
    adoptedVersionId: ArtifactVersionId | null
    createdAt: number
    updatedAt: number
}

export interface ArtifactVersion {
    id: ArtifactVersionId
    artifactId: ArtifactId
    versionIndex: number
    contentType: ArtifactContentType
    contentText: string | null
    contentJson: any
    contentUrl: string | null
    meta: ArtifactMeta | null
    createdAt: number
}

export interface VersionedArtifactStore {
    ensureArtifact(args: {
        projectId: ProjectId
        nodeId: NodeId
        capabilityId: CapabilityId
        type: ArtifactContentType
    }): Promise<Artifact>

    listVersions(args: {
        projectId: ProjectId
        nodeId: NodeId
        capabilityId: CapabilityId
        limit?: number
    }): Promise<ArtifactVersion[]>

    getAdopted(args: {
        projectId: ProjectId
        nodeId: NodeId
        capabilityId: CapabilityId
    }): Promise<ArtifactVersion | null>

    getVersionById(args: {
        projectId: ProjectId
        nodeId: NodeId
        capabilityId: CapabilityId
        versionId: ArtifactVersionId
    }): Promise<ArtifactVersion | null>

    appendVersion(args: {
        projectId: ProjectId
        nodeId: NodeId
        capabilityId: CapabilityId
        contentType: ArtifactContentType
        contentText?: string | null
        contentJson?: any
        contentUrl?: string | null
        meta?: ArtifactMeta | null
        adopt?: boolean
    }): Promise<ArtifactVersion>

    adoptVersion(args: {
        projectId: ProjectId
        nodeId: NodeId
        capabilityId: CapabilityId
        versionId: ArtifactVersionId
    }): Promise<{ ok: true }>
}

import type { Identifiable, Timestamped, Id } from './contracts'

export type ArtifactType = 'script' | 'storyboard' | 'image' | 'video' | 'log' | 'json' | 'text'
export type StepStatus = 'idle' | 'running' | 'succeeded' | 'failed'
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'

export interface Project extends Identifiable, Timestamped {
    name: string
}

export interface Step extends Timestamped {
    projectId: Id
    stepId: string
    title: string
    status: StepStatus
    artifactSummary: string
    adoptedArtifactVersionId?: Id | null
}

export interface Run extends Identifiable, Timestamped {
    projectId: Id
    kind: string
    status: RunStatus
    inputJson: any
    error?: string | null
    startedAt?: number | null
    finishedAt?: number | null
}

export interface Artifact extends Identifiable, Timestamped {
    projectId: Id
    stepId: string
    type: ArtifactType
}

export interface ArtifactVersion extends Identifiable, Timestamped {
    artifactId: Id
    versionIndex: number
    contentType: 'text' | 'json'
    contentText?: string | null
    contentJson?: any
    metaJson?: any
    promptSummary?: string | null
    adopted: boolean
}

export interface Event extends Identifiable {
    runId: Id
    type: string
    ts: number
    payloadJson: any
}

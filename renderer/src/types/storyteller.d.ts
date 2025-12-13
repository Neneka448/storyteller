export { }

declare global {
    interface Window {
        storyteller?: {
            version?: () => string
            settings?: {
                get?: () => Promise<{
                    baseUrl: string
                    pathPrefix: string
                    model: string
                    apiKey: string
                    // legacy
                    endpoint?: string
                }>
                set?: (partial: {
                    baseUrl?: string
                    pathPrefix?: string
                    model?: string
                    apiKey?: string
                    // legacy
                    endpoint?: string
                }) => Promise<{
                    baseUrl: string
                    pathPrefix: string
                    model: string
                    apiKey: string
                    endpoint?: string
                }>
                testConnection?: () => Promise<{
                    ok: boolean
                    status: number
                    url: string
                    bodyPreview: string
                }>
            }
            projects?: {
                list?: () => Promise<Array<{ id: string; name: string; createdAt: number; updatedAt: number }>>
                getActive?: () => Promise<{ id: string; name: string; createdAt: number; updatedAt: number } | null>
                setActive?: (projectId: string) => Promise<{ ok: true }>
                create?: (name?: string) => Promise<{ id: string; name: string; createdAt: number; updatedAt: number } | null>
                delete?: (projectId: string) => Promise<{ ok: true }>
            }
            nodes?: {
                list?: (projectId: string) => Promise<
                    Array<{
                        projectId: string
                        nodeId: string
                        parentId: string | null
                        orderIndex: number
                        title: string
                        type: string
                        capabilities: string[]
                        status: string
                        createdAt: number
                        updatedAt: number
                    }>
                >
            }
            capabilities?: {
                list?: () => Promise<
                    Array<{
                        id: string
                        render: { componentName: string; uiOptions?: Record<string, any> } | null
                    }>
                >
            }
            artifacts?: {
                listVersions?: (
                    projectId: string,
                    nodeId: string,
                    capabilityId: string
                ) => Promise<
                    Array<{
                        id: string
                        artifactId: string
                        versionIndex: number
                        contentType: string
                        contentText: string | null
                        contentJson: any
                        createdAt: number
                        contentUrl: string | null
                        meta: any
                    }>
                >
                getAdopted?: (projectId: string, nodeId: string, capabilityId: string) => Promise<{
                    id: string
                    artifactId: string
                    versionIndex: number
                    contentType: string
                    contentText: string | null
                    contentJson: any
                    createdAt: number
                    contentUrl: string | null
                    meta: any
                } | null>
                appendVersion?: (args: {
                    projectId: string
                    nodeId: string
                    capabilityId: string
                    contentType: 'text' | 'json' | 'image'
                    contentText?: string | null
                    contentJson?: any
                    contentUrl?: string | null
                    meta?: any
                    adopt?: boolean
                }) => Promise<{ id: string; artifactId: string; versionIndex: number; contentType: string; contentText: string | null; contentJson: any; contentUrl: string | null; meta: any; createdAt: number }>
                adoptVersion?: (projectId: string, nodeId: string, capabilityId: string, versionId: string) => Promise<{ ok: true }>
            }
            runs?: {
                list?: (projectId: string, limit?: number) => Promise<
                    Array<{
                        id: string
                        projectId: string
                        kind: string
                        status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'
                        inputJson: any
                        error: string | null
                        startedAt: number | null
                        finishedAt: number | null
                        createdAt: number
                        updatedAt: number
                    }>
                >
                events?: (runId: string, limit?: number) => Promise<
                    Array<{
                        id: string
                        runId: string
                        type: string
                        ts: number
                        payloadJson: any
                    }>
                >
            }
            events?: {
                on?: (handler: (e: { type: string; payload: any }) => void) => () => void
            }
            runner?: {
                runCapability?: (args: {
                    projectId: string
                    nodeId: string
                    capabilityId: string
                    mode?: 'run' | 'redo'
                    instruction?: string
                    baseVersionId?: string
                    operation?: string
                    operationArgs?: any
                    directContent?: {
                        contentType: 'text' | 'json' | 'image'
                        contentText?: string | null
                        contentJson?: any
                        contentUrl?: string | null
                    }
                    meta?: any
                    adopt?: boolean
                }) => Promise<{
                    ok: true
                    runId: string
                    projectId: string
                    nodeId: string
                    capabilityId: string
                    versionId: string
                    artifactId: string
                    versionIndex: number
                }>
            }
            agent?: {
                start?: (payload: {
                    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
                }) => Promise<string>
                cancel?: (streamId: string) => void
                onDelta?: (handler: (event: { streamId: string; delta: string }) => void) => () => void
                onDone?: (handler: (event: { streamId: string }) => void) => () => void
                onError?: (handler: (event: { streamId: string; error: string }) => void) => () => void
                onToolCall?: (
                    handler: (event: { streamId: string; name: string; args: any }) => void
                ) => () => void
            }
        }
    }
}

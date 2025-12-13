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
            steps?: {
                list?: (projectId: string) => Promise<
                    Array<{
                        projectId: string
                        stepId: string
                        nodeType: string | null
                        uiBlocks: Array<{ type: string; title: string }>
                        title: string
                        status: string
                        artifactSummary: string
                        adoptedArtifactVersionId: string | null
                        createdAt: number
                        updatedAt: number
                    }>
                >
            }
            artifacts?: {
                listVersions?: (
                    projectId: string,
                    stepId: string
                ) => Promise<
                    Array<{
                        id: string
                        versionIndex: number
                        contentType: string
                        contentText: string | null
                        contentJson: any
                        adopted: boolean
                        createdAt: number
                        updatedAt: number
                    }>
                >
                getAdopted?: (projectId: string, stepId: string) => Promise<{
                    id: string
                    versionIndex: number
                    contentType: string
                    contentText: string | null
                    contentJson: any
                    adopted: boolean
                    createdAt: number
                    updatedAt: number
                } | null>
                appendTextVersion?: (
                    projectId: string,
                    stepId: string,
                    contentText: string
                ) => Promise<{ id: string; versionIndex: number; contentType: string; contentText: string; adopted: boolean; createdAt: number; updatedAt: number }>
                adoptVersion?: (projectId: string, stepId: string, versionId: string) => Promise<{ ok: true }>
            }
            pipeline?: {
                runStep?: (args: {
                    projectId?: string
                    stepId: string
                    mode?: 'run' | 'redo'
                    baseVersionId?: string
                    instruction?: string
                    contentText?: string
                    contentJson?: any
                }) => Promise<
                    | {
                        ok: true
                        runId: string
                        projectId: string
                        stepId: string
                        versionId: string
                        versionIndex: number
                    }
                    | any
                >
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

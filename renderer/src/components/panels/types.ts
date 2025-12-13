export type ArtifactVersion = {
    id: string
    artifactId: string
    versionIndex: number
    contentType: string
    contentText: string | null
    contentJson: any
    createdAt: number
    contentUrl?: string | null
    meta?: any
}

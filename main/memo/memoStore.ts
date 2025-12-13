export type MemoVersion = {
    id: string
    versionIndex: number
    contentType: string
    contentText: string | null
    contentJson: any
    adopted: boolean
    createdAt: number
    updatedAt: number
}

// 备忘录模式的“最小稳定接口”：后续无论是 UI 编辑还是 LLM 工具调用，都只依赖它。
export interface MemoStore {
    listVersions(projectId: string, stepId: string): MemoVersion[]
    getAdopted(projectId: string, stepId: string): MemoVersion | null
    getVersionById(projectId: string, stepId: string, versionId: string): MemoVersion | null
    appendTextVersion(projectId: string, stepId: string, contentText: string): MemoVersion
    appendJsonVersion(projectId: string, stepId: string, contentJson: any): MemoVersion
    adoptVersion(projectId: string, stepId: string, versionId: string): { ok: true }
}

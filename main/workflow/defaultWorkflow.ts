export type StepKind = 'memo'

export type WorkflowStepDef = {
    stepId: string
    title: string
    kind: StepKind
    artifactSummary: string
}

export type WorkflowDef = {
    id: string
    title: string
    steps: WorkflowStepDef[]
}

// v0.1：固定线性步骤链（可配置化，后续可切换 workflowId 或扩展 DAG）
export const DEFAULT_WORKFLOW_V01: WorkflowDef = {
    id: 'wf_v0_1_linear',
    title: 'v0.1 线性步骤链',
    steps: [
        { stepId: 'step_world', title: '世界观草案', kind: 'memo', artifactSummary: '文本（待生成）' },
        { stepId: 'step_character', title: '角色草案', kind: 'memo', artifactSummary: '文本（待生成）' },
        { stepId: 'step_outline', title: '大纲', kind: 'memo', artifactSummary: '文本（待生成）' },
        { stepId: 'step_script', title: '剧本', kind: 'memo', artifactSummary: '文本（待生成）' },
        { stepId: 'step_storyboard', title: '分镜（镜头列表）', kind: 'memo', artifactSummary: '表格（待生成）' },
        { stepId: 'step_char_image', title: '角色设定图', kind: 'memo', artifactSummary: '图片（待生成）' },
        { stepId: 'step_keyframes', title: '关键帧', kind: 'memo', artifactSummary: '图片（待生成）' }
    ]
}

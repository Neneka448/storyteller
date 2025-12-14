export type FieldValueType = 'text' | 'longtext'

export type TemplateField = {
    key: string
    label: string
    valueType: FieldValueType
    prompt?: string
    optional?: boolean
}

export type SectionChildrenList = {
    type: 'childrenList'
    title: string
    emptyHint?: string
}

export type SectionKvGroup = {
    type: 'kvGroup'
    title: string
    capabilityId: 'kv'
    fields: TemplateField[]
    showOtherFields?: boolean
}

export type SectionMemoBlock = {
    type: 'memoBlock'
    title: string
    capabilityId: 'memo'
    prompt?: string
}

export type SectionCapabilityPanel = {
    type: 'capabilityPanel'
    title: string
    capabilityId: string
}

export type TemplateSection =
    | SectionChildrenList
    | SectionKvGroup
    | SectionMemoBlock
    | SectionCapabilityPanel

export type NodeTemplate = {
    id: string
    label: string
    match: (nodeType: string) => boolean
    requiredCapabilities?: string[]
    sections: TemplateSection[]
}

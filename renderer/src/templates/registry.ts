import type { NodeTemplate } from './types'

function matchPrefix(prefix: string) {
  return (nodeType: string) => String(nodeType || '').startsWith(prefix)
}

function matchAny(matchers: Array<(t: string) => boolean>) {
  return (nodeType: string) => matchers.some((m) => m(nodeType))
}

export const templates: NodeTemplate[] = [
  {
    id: 'world.category',
    label: '世界观分类页',
    match: matchAny([matchPrefix('world.root'), matchPrefix('world.category.'), matchPrefix('world.ecology.monsters')]),
    // Note: capabilities may be incomplete on old projects; renderer should degrade gracefully.
    requiredCapabilities: ['kv', 'memo'],
    sections: [
      {
        type: 'childrenList',
        title: '条目',
        emptyHint: '这个分类下还没有子条目。'
      },
      {
        type: 'memoBlock',
        title: '概述',
        capabilityId: 'memo',
        prompt: '用 3～7 句话概括这个分类下的核心设定与创作要点。'
      },
      {
        type: 'kvGroup',
        title: '关键信息',
        capabilityId: 'kv',
        showOtherFields: true,
        fields: [
          { key: 'summary', label: '一句话摘要', valueType: 'text', optional: true },
          { key: 'focus', label: '创作重点', valueType: 'longtext', optional: true },
          { key: 'todo', label: '待补全清单', valueType: 'longtext', optional: true }
        ]
      }
    ]
  }
  ,
  {
    id: 'world.geo.map',
    label: '地图条目',
    match: (t) => String(t) === 'world.geo.map',
    requiredCapabilities: ['image'],
    sections: [{ type: 'capabilityPanel', title: '地图', capabilityId: 'image' }]
  },
  {
    id: 'world.society.factions',
    label: '关系/势力可视化',
    match: (t) => String(t) === 'world.society.factions',
    requiredCapabilities: ['sandbox'],
    sections: [{ type: 'capabilityPanel', title: '可视化', capabilityId: 'sandbox' }]
  },
  {
    id: 'world.leaf.kv',
    label: '世界观条目（KV）',
    // Most world.* leaf nodes in MVP are KV-only.
    match: (t) => {
      const s = String(t || '')
      if (!s.startsWith('world.')) return false
      if (s === 'world.root') return false
      if (s.startsWith('world.category.')) return false
      if (s === 'world.geo.map') return false
      if (s === 'world.society.factions') return false
      if (s === 'world.ecology.monsters') return false
      // memo-only nodes have their own templates
      if (s === 'world.history.timeline') return false
      if (s === 'world.history.legends') return false
      return true
    },
    requiredCapabilities: ['kv'],
    sections: [
      { type: 'kvGroup', title: '关键信息', capabilityId: 'kv', showOtherFields: true, fields: [] },
      { type: 'capabilityPanel', title: '高级（原始 KV）', capabilityId: 'kv' }
    ]
  },
  {
    id: 'world.history.timeline',
    label: '编年史（文本）',
    match: (t) => String(t) === 'world.history.timeline',
    requiredCapabilities: ['memo'],
    sections: [{ type: 'capabilityPanel', title: '正文', capabilityId: 'memo' }]
  },
  {
    id: 'world.history.legends',
    label: '英雄传说（文本）',
    match: (t) => String(t) === 'world.history.legends',
    requiredCapabilities: ['memo'],
    sections: [{ type: 'capabilityPanel', title: '正文', capabilityId: 'memo' }]
  },
  {
    id: 'char.card',
    label: '角色卡',
    match: (t) => String(t || '').startsWith('char.card.'),
    requiredCapabilities: ['kv', 'memo', 'image'],
    sections: [
      { type: 'capabilityPanel', title: '立绘', capabilityId: 'image' },
      { type: 'capabilityPanel', title: '设定（文本）', capabilityId: 'memo' },
      { type: 'capabilityPanel', title: '设定（结构化）', capabilityId: 'kv' }
    ]
  },
  {
    id: 'char.draft',
    label: '角色草案',
    match: (t) => String(t) === 'char.draft',
    requiredCapabilities: ['kv', 'memo', 'image'],
    sections: [
      { type: 'capabilityPanel', title: '立绘', capabilityId: 'image' },
      { type: 'capabilityPanel', title: '草案（文本）', capabilityId: 'memo' },
      { type: 'capabilityPanel', title: '草案（结构化）', capabilityId: 'kv' }
    ]
  },
  {
    id: 'writing.outline',
    label: '大纲',
    match: (t) => String(t) === 'writing.outline',
    requiredCapabilities: ['memo'],
    sections: [{ type: 'capabilityPanel', title: '正文', capabilityId: 'memo' }]
  },
  {
    id: 'writing.script',
    label: '剧本',
    match: (t) => String(t) === 'writing.script',
    requiredCapabilities: ['memo'],
    sections: [{ type: 'capabilityPanel', title: '正文', capabilityId: 'memo' }]
  },
  {
    id: 'storyboard.main',
    label: '分镜',
    match: (t) => String(t) === 'storyboard.main',
    requiredCapabilities: ['storyboard', 'sandbox'],
    sections: [
      { type: 'capabilityPanel', title: '分镜表', capabilityId: 'storyboard' },
      { type: 'capabilityPanel', title: '预览/渲染', capabilityId: 'sandbox' }
    ]
  }
]

export function resolveTemplate(nodeType: string): NodeTemplate | null {
  const t = String(nodeType || '')
  return templates.find((x) => x.match(t)) ?? null
}

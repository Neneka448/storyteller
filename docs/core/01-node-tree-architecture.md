# 01. 节点与树架构 (Node & Tree Architecture)

## 1. 核心理念：Block Tree (块状树)

Storyteller 的核心数据结构不再是扁平的 `Steps` 列表，而是一棵无限嵌套的 **Block Tree**。这参考了 Notion、Obsidian 和文件系统的设计。

### 为什么选择树结构？
- **业务拟合**：世界观天然是层级化的（世界 -> 大陆 -> 国家 -> 城市 -> 街道）。
- **无限扩展**：用户可以随意增加层级，而不受预设表单限制。
- **统一抽象**：无论是“文件夹”、“世界观总览”还是“具体的角色卡”，本质上都是树上的一个 **Node**。

## 2. 数据模型 (Data Model)

### INodeEntity (实体)
Node 是一个轻量级的容器，只负责结构关系，不负责具体业务数据。

```typescript
interface INodeEntity {
  // 唯一标识 (UUID)
  id: string;
  
  // 父节点 ID (Root 节点为 null)
  parentId: string | null;
  
  // 节点在当前层级的排序权重
  orderIndex: number;
  
  // 节点标题/名称
  title: string;
  
  // 节点类型 (用于 UI 图标、默认配置)
  // e.g., 'world.root', 'folder', 'char.card'
  type: string;
  
  // 挂载的能力列表 (Capabilities)
  // e.g., ['kv', 'gen_image', 'renderable']
  capabilities: string[];
  
  // 创建/更新时间
  createdAt: number;
  updatedAt: number;
}
```

### 组合模式 (Composite vs Leaf)
虽然数据结构上都是 Node，但在逻辑上我们区分：
- **Composite Node (组合节点)**: 主要职责是组织子节点（如“地理篇”文件夹）。通常挂载 `FolderCapability`。
- **Leaf Node (叶子节点)**: 主要职责是承载内容（如“亚特兰蒂斯”设定）。通常挂载 `KvCapability`, `DocCapability`。

*注意：这种区分是软性的。一个 Leaf Node 也可以有子节点（例如“亚特兰蒂斯”下面挂“皇宫”），实现了真正的无限嵌套。*

## 3. 树的持久化 (Persistence)

推荐使用 **Adjacency List (邻接表)** 模式存储在 SQLite `nodes` 表中。

```sql
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_id TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  capabilities_json TEXT NOT NULL, -- JSON array
  order_index REAL NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX idx_nodes_parent ON nodes(parent_id);
CREATE INDEX idx_nodes_project ON nodes(project_id);
```

## 4. 树的操作与遍历

### INodeTreeRepository
核心仓储接口，负责树的增删改查。

```typescript
interface INodeTreeRepository {
  // 获取某节点的所有直接子节点 (按 orderIndex 排序)
  listChildren(parentId: string): Promise<INodeEntity[]>;
  
  // 获取完整的子树结构 (用于前端一次性渲染或 LLM 上下文构建)
  getSubTree(rootId: string, depth?: number): Promise<NodeTree>;
  
  // 创建节点
  createNode(payload: CreateNodePayload): Promise<INodeEntity>;
  
  // 移动节点 (Reparenting / Reordering)
  moveNode(nodeId: string, newParentId: string, newOrder: number): Promise<void>;
  
  // 删除节点 (及其子树)
  deleteNode(nodeId: string): Promise<void>;
}
```

## 5. 聚合策略 (Aggregation)
为了给 LLM 提供上下文，我们需要将树“拍扁”。
- **Context Aggregator**: 从当前节点向上遍历至 Root，收集路径上的关键信息（如父节点的 Summary）。
- **Content Aggregator**: 遍历子树，将所有 Leaf Node 的内容（KV, Text）按层级拼接成 Markdown，作为“世界观设定集”喂给大模型。

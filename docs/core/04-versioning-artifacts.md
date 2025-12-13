# 04. 版本化与工件存储 (Versioning & Artifacts)

## 1. 核心理念：一切皆可回溯

在创作工具中，用户的每一次修改、LLM 的每一次生成，都应该被记录。Storyteller 采用 **Append-only (仅追加)** 的版本策略，支持细粒度的版本控制。

## 2. 数据模型：Artifacts & Versions

### Artifact (工件容器)
Artifact 是版本数据的容器。在 v3.0 架构中，Artifact 不再绑定 Step，而是绑定 **(Node, Capability)**。
这意味着一个节点可以有多个 Artifact（一个存 KV 数据，一个存图片，一个存渲染脚本），它们独立版本化。

```typescript
interface IArtifact {
  id: string;
  projectId: string;
  nodeId: string;
  capabilityId: string; // e.g., 'kv', 'gen_image'
  type: string; // 'json', 'text', 'image'
}
```

### ArtifactVersion (具体版本)
```typescript
interface IArtifactVersion {
  id: string;
  artifactId: string;
  versionIndex: number; // v1, v2, v3...
  
  // 内容 (多态存储)
  contentJson?: any;
  contentText?: string;
  contentUrl?: string;
  
  // 元数据
  meta?: {
    author: 'user' | 'agent';
    prompt?: string; // 如果是 AI 生成的，记录 Prompt
    baseVersionId?: string; // 基于哪个版本修改的 (Redo 溯源)
  };
  
  createdAt: number;
}
```

## 3. IVersionedArtifactStore 接口

这是系统对数据存储的核心抽象。

```typescript
interface IVersionedArtifactStore {
  // 获取某节点某能力的所有版本
  listVersions(nodeId: string, capabilityId: string): Promise<IArtifactVersion[]>;
  
  // 获取当前采纳的版本 (Head)
  getAdopted(nodeId: string, capabilityId: string): Promise<IArtifactVersion | null>;
  
  // 采纳指定版本 (Rollback / Switch)
  adoptVersion(nodeId: string, capabilityId: string, versionId: string): Promise<void>;
  
  // 追加新版本 (Create)
  appendVersion(
    nodeId: string, 
    capabilityId: string, 
    content: any, 
    meta?: any
  ): Promise<IArtifactVersion>;
}
```

## 4. 采纳 (Adopt) 与基线 (Baseline) 机制

- **Adopted Version**: 每个 Artifact 都有一个指针指向“当前生效版本”。UI 默认显示此版本，LLM 读取上下文时也读取此版本。
- **Baseline for Redo**: 当用户点击 "Redo" 或 "Refine" 时，系统会读取当前 Adopted 版本作为 **Baseline**，将用户的指令 (Instruction) 叠加在 Baseline 上生成新版本。

## 5. 存储策略

- **KV / JSON**: 存 `contentJson` 字段 (SQLite JSON Column)。
- **Text / Markdown**: 存 `contentText` 字段。
- **Image / Binary**: 存文件系统路径或 URL 到 `contentUrl`，元数据存 DB。

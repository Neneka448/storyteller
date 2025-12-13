# 01 核心合同（Core Contracts）

目的：把 docs/core 中的 Node Tree + Capability Facets + Event/Context + Versioned Artifacts 抽象，落成仓库可执行的“唯一权威合同”（后续模块不得各自重复定义核心类型）。

依赖
- 无（第一步）

## Checklist

### A. 术语与边界（必须写清楚）
- [x] 明确并冻结三类对象：
  - [x] Node：树结构实体（组织关系，不包含具体业务内容）
  - [x] Capability：挂载在 Node 上的能力（数据 + 行为 + 可渲染 + 可被 Agent 调用）
  - [x] Artifact/Version：Capability 的版本化内容载体
- [x] 明确 Step 的去留：
  - [x] Step 彻底移除（本轮不保留壳/兼容层）；所有 UI/执行/落库一律以 nodeId+capabilityId 为第一公民。

### B. ID 语义（统一字符串，但含义必须固定）
- [x] projectId：项目 ID
- [x] nodeId：节点 ID（Node Tree 内的实体）
- [x] capabilityId：能力 ID（挂在 node.capabilities[]；如 kv/memo/sandbox/image/storyboard）
- [x] artifactId / artifactVersionId：版本化产物与版本 ID（按 nodeId+capabilityId 唯一定位 artifact）
- [x] runId / eventId：运行链路与事件 ID（可观测性，后续完善）

### C. Node Tree 合同
- [x] INodeEntity：字段集合与含义（parentId/orderIndex/type/title/capabilities/status/createdAt/updatedAt）
- [x] INodeTreeRepository：
  - [x] listChildren(projectId,parentId)
  - [x] getById(projectId,nodeId)
  - [x] createNode(projectId,parentId,title,type,capabilities?,orderIndex?)
  - [x] moveNode(projectId,nodeId,newParentId,newOrderIndex)
  - [x] updateNode(projectId,nodeId,title?,type?,capabilities?)
  - [x] deleteNode(projectId,nodeId)

### D. Capability Facets 合同（接口隔离）
- [x] ISchemaProvider：defaultData/validate/getJsonSchema
- [x] IRenderableFacet：componentName/uiOptions
- [x] IAgentToolProvider：getTools/invokeTool
- [x] IOperatableFacet：execute(operation,args,currentData)
- [x] INodeCapability：capabilityId + 可选 facets + 生命周期钩子（onMount/onUnmount）

### E. Context & Event 合同
- [x] ICapabilityContext：projectId/nodeId/services/events/config + getSiblingData
- [x] IEventBus：emit/on + 事件命名规范（至少 data:changed/run:*)

### F. Versioned Artifact 合同
- [x] IVersionedArtifactStore：list/getAdopted/getById/append/adopt
- [x] 内容多态：text/json/image（image 通过 contentUrl 表达）

## 完成定义（DoD）
- [x] 本文件中输出：
  - [x] 术语边界与 Step 处置结论
  - [x] 全量接口清单（方法名/参数含义）
  - [x] 事件命名与 payload 最小字段
- [x] 后续模块只引用这里定义的名字与语义，不再出现“同义不同名”

## 冻结结论（本轮不再改名）

### 1) Step 处置
- Step 概念彻底移除。
- 所有“流程项/面板/执行目标”统一由 Node + Capability 表达。

### 2) 唯一权威代码位置
- 合同：main/core/contracts/*
- SQLite 实现：main/core/sqlite/*

## 接口清单（以 main/core/contracts 为准）

### IDs
- ProjectId / NodeId / CapabilityId / ArtifactId / ArtifactVersionId / RunId / EventId：均为 string，但语义固定。

### Node Tree
- NodeEntity：
  - id, projectId, parentId, orderIndex, title, type, capabilities, status, createdAt, updatedAt
- NodeTreeRepository：
  - listChildren({projectId,parentId}) -> NodeEntity[]
  - getById({projectId,nodeId}) -> NodeEntity|null
  - createNode({projectId,parentId,title,type,capabilities?,orderIndex?}) -> NodeEntity
  - moveNode({projectId,nodeId,newParentId,newOrderIndex}) -> {ok:true}
  - updateNode({projectId,nodeId,title?,type?,capabilities?}) -> NodeEntity
  - deleteNode({projectId,nodeId}) -> {ok:true}

### Versioned Artifacts
- VersionedArtifactStore：
  - ensureArtifact({projectId,nodeId,capabilityId,type}) -> Artifact
  - listVersions({projectId,nodeId,capabilityId,limit?}) -> ArtifactVersion[]
  - getAdopted({projectId,nodeId,capabilityId}) -> ArtifactVersion|null
  - getVersionById({projectId,nodeId,capabilityId,versionId}) -> ArtifactVersion|null
  - appendVersion({projectId,nodeId,capabilityId,contentType,contentText?,contentJson?,contentUrl?,meta?,adopt?}) -> ArtifactVersion
  - adoptVersion({projectId,nodeId,capabilityId,versionId}) -> {ok:true}

### Capability Facets
- SchemaProvider<TData>：defaultData / validate / getJsonSchema
- RenderableFacet：componentName / uiOptions?
- AgentToolProvider：getTools / invokeTool
- OperatableFacet<TData>：execute(operation,args,currentData)
- NodeCapability<TData,TConfig>：id + schema + (render/agent/operation) + (onMount/onUnmount)

### Context & Event
- EventBus：emit(event,payload) / on(event,handler)
- CapabilityContext：projectId/nodeId/capabilityId/config/events/artifacts/getSiblingData

## 事件命名与 payload 最小字段（冻结）

### 事件名
- run:start | run:succeeded | run:failed
- artifact:appended | artifact:adopted
- data:changed
- agent:tool.call | agent:tool.result | agent:tool.error

### payload 最小字段
- 通用字段：
  - ts: number
  - projectId: string
  - nodeId: string
  - capabilityId: string
- 版本相关（若适用）：
  - artifactId: string
  - versionId: string
  - versionIndex: number
- 运行相关（若适用）：
  - runId: string
  - error?: string

# 03 版本化产物存储（Versioned Artifact Store）

目的：把“内容”统一落到 (projectId, nodeId, capabilityId) 维度的版本化存储，支持 append/adopt/baseline/redo；不再以 stepId 为第一公民。

依赖
- 01-core-contracts
- 02-capability-registry（用于 capabilityId 规范）

## Checklist

### A. 接口（IVersionedArtifactStore）
- [x] listVersions(projectId, nodeId, capabilityId)
- [x] getAdopted(projectId, nodeId, capabilityId)
- [x] getVersionById(projectId, nodeId, capabilityId, versionId)
- [x] appendVersion(projectId, nodeId, capabilityId, content, meta)
- [x] adoptVersion(projectId, nodeId, capabilityId, versionId)

### B. DB 设计（SQLite）
- [x] nodes 表（树结构）
- [x] artifacts 表：唯一键 (projectId,nodeId,capabilityId)
- [x] artifact_versions 表：append-only + versionIndex
- [x] adopted 指针策略：artifact 表记录 adopted_version_id（避免全量 update adopted 标记）
- [x] 索引：projectId/nodeId、artifactId、(nodeId,capabilityId)

### C. 内容类型与 meta
- [x] contentType: text/json/image（image 以 contentUrl 形式落库）
- [ ] meta 最小字段：author(user/agent)、promptSummary、baseVersionId、createdAt（author/createdAt 已由 store 自动补齐；promptSummary/baseVersionId 待接线）

### D. Summary 生成策略
- [ ] 统一由 adopted version 计算 artifactSummary（当前 nodes 列表未返回 summary；仍有 legacy artifactSummary 字段残留）

## 完成定义（DoD）
- [x] 任意 capability 的数据都能版本化：append → list → adopt → getAdopted
- [ ] redo 可基于 baseVersionId 读取 baseline 并写入 meta.baseVersionId（当前 store 未实现 baseline/redo 语义，仅提供 getVersionById）

## 下一步落地建议（最小闭环）
- meta 规范化：appendVersion 时补齐 meta.author/meta.createdAt；runner/tool 写入时填 promptSummary/baseVersionId
- redo/baseline：orchestrator 在 mode=redo 时读取 baseVersionId 作为 baseline，并写 meta.baseVersionId
- summary：ProjectService.listNodes 计算 adopted 版本摘要（按 contentType 输出 “文本/JSON/图片 + 简短长度信息”）

## 落地点（代码）
- DB schema：main/db/schema.ts
- SQLite 实现：main/core/sqlite/sqliteVersionedArtifactStore.ts
- IPC API：main/main.ts（artifact:*）
- Renderer 使用：renderer/src/components/NodeInspector.vue

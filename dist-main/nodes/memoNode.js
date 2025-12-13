"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoNode = void 0;
/**
 * MemoNode：备忘录模式节点
 * - seed：为 step 创建 1 个 artifact + 1 个空版本
 * - run/redo：后续由 PipelineRunner + MemoStore 统一实现
 */
class MemoNode {
    artifactRepo;
    kind = 'memo';
    constructor(artifactRepo) {
        this.artifactRepo = artifactRepo;
    }
    seed(ctx) {
        this.artifactRepo.ensureTextArtifactSeeded(ctx.projectId, ctx.stepId);
    }
}
exports.MemoNode = MemoNode;

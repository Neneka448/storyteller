"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultPipelineV01 = void 0;
// v0.1：固定线性步骤链（配置化，后续可扩展多 pipeline / DAG）
class DefaultPipelineV01 {
    steps;
    constructor(steps) {
        this.steps = steps;
    }
    definition() {
        return {
            id: 'wf_v0_1_linear',
            title: 'v0.1 线性步骤链',
            steps: this.steps
        };
    }
}
exports.DefaultPipelineV01 = DefaultPipelineV01;

import type { Pipeline, PipelineDef } from './contracts'

import type { PipelineStepDef } from './contracts'

// v0.1：固定线性步骤链（配置化，后续可扩展多 pipeline / DAG）
export class DefaultPipelineV01 implements Pipeline {
    constructor(private readonly steps: PipelineStepDef[]) { }

    definition(): PipelineDef {
        return {
            id: 'wf_v0_1_linear',
            title: 'v0.1 线性步骤链',
            steps: this.steps
        }
    }
}

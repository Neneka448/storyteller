import { InMemoryPipelineRegistry } from '../pipeline/registry'
import { DefaultPipelineV01 } from '../pipeline/defaultPipeline'
import { InMemoryNodeRegistry } from '../nodes/registry'

import { ArtifactRepo } from './artifactRepo'
import { ArtifactService } from './artifactService'
import { ProjectService } from './projectService'
import {
    OutlineMemoNode,
    ScriptMemoNode,
    StoryboardMemoNode,
    CharacterImageMemoNode,
    KeyframesMemoNode
} from '../nodes/impl/memoSteps'
import { CharacterKvNode } from '../nodes/impl/kvSteps'
import { createWorldModule } from '../domain/world/worldModule'
import { PipelineRunner } from '../pipeline/runner'
import { LlmService } from './llmService'
import { RunRepo } from './runRepo'

export type Services = {
    artifactRepo: ArtifactRepo
    memoStore: ArtifactService
    llm: LlmService
    runRepo: RunRepo
    pipelineRegistry: InMemoryPipelineRegistry
    nodeRegistry: InMemoryNodeRegistry
    projectService: ProjectService
    pipelineRunner: PipelineRunner
}

let _servicesByPath = new Map<string, Services>()

export function getServices(userDataPath: string): Services {
    const existing = _servicesByPath.get(userDataPath)
    if (existing) return existing

    const artifactRepo = new ArtifactRepo(userDataPath)
    const memoStore = new ArtifactService(userDataPath)
    const llm = new LlmService(userDataPath)
    const runRepo = new RunRepo(userDataPath)

    const pipelineRegistry = new InMemoryPipelineRegistry()

    const nodeRegistry = new InMemoryNodeRegistry()

    const world = createWorldModule(artifactRepo)

    const character = new CharacterKvNode(artifactRepo)
    const outline = new OutlineMemoNode(artifactRepo)
    const script = new ScriptMemoNode(artifactRepo)
    const storyboard = new StoryboardMemoNode(artifactRepo)
    const charImage = new CharacterImageMemoNode(artifactRepo)
    const keyframes = new KeyframesMemoNode(artifactRepo)

    const steps = [
        ...world.steps,
        {
            stepId: 'step_character',
            title: '角色草案（KV）',
            node: character,
            initialArtifactSummary: 'KV（待补充）'
        },
        {
            stepId: 'step_outline',
            title: '大纲',
            node: outline,
            initialArtifactSummary: '文本（待生成）'
        },
        {
            stepId: 'step_script',
            title: '剧本',
            node: script,
            initialArtifactSummary: '文本（待生成）'
        },
        {
            stepId: 'step_storyboard',
            title: '分镜（镜头列表）',
            node: storyboard,
            initialArtifactSummary: '表格（待生成）'
        },
        {
            stepId: 'step_char_image',
            title: '角色设定图',
            node: charImage,
            initialArtifactSummary: '图片（待生成）'
        },
        {
            stepId: 'step_keyframes',
            title: '关键帧',
            node: keyframes,
            initialArtifactSummary: '图片（待生成）'
        }
    ]

    const nodesToRegister = [
        world.nodes.overview,
        ...Object.values(world.nodes.sections),
        character,
        outline,
        script,
        storyboard,
        charImage,
        keyframes
    ]
    for (const n of nodesToRegister) nodeRegistry.register(n)

    pipelineRegistry.register(new DefaultPipelineV01(steps))

    const defaultPipelineId = 'wf_v0_1_linear'
    const projectService = new ProjectService(userDataPath, pipelineRegistry, nodeRegistry, defaultPipelineId)

    const pipelineRunner = new PipelineRunner({
        userDataPath,
        projectService,
        pipelineRegistry,
        nodeRegistry,
        memoStore,
        llm,
        runRepo,
        defaultPipelineId
    })

    const services: Services = {
        artifactRepo,
        memoStore,
        llm,
        runRepo,
        pipelineRegistry,
        nodeRegistry,
        projectService,
        pipelineRunner
    }

    _servicesByPath.set(userDataPath, services)
    return services
}

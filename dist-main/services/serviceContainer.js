"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServices = getServices;
const registry_1 = require("../pipeline/registry");
const defaultPipeline_1 = require("../pipeline/defaultPipeline");
const registry_2 = require("../nodes/registry");
const artifactRepo_1 = require("./artifactRepo");
const artifactService_1 = require("./artifactService");
const projectService_1 = require("./projectService");
const memoSteps_1 = require("../nodes/impl/memoSteps");
const kvSteps_1 = require("../nodes/impl/kvSteps");
const worldModule_1 = require("../domain/world/worldModule");
const runner_1 = require("../pipeline/runner");
const llmService_1 = require("./llmService");
const runRepo_1 = require("./runRepo");
let _servicesByPath = new Map();
function getServices(userDataPath) {
    const existing = _servicesByPath.get(userDataPath);
    if (existing)
        return existing;
    const artifactRepo = new artifactRepo_1.ArtifactRepo(userDataPath);
    const memoStore = new artifactService_1.ArtifactService(userDataPath);
    const llm = new llmService_1.LlmService(userDataPath);
    const runRepo = new runRepo_1.RunRepo(userDataPath);
    const pipelineRegistry = new registry_1.InMemoryPipelineRegistry();
    const nodeRegistry = new registry_2.InMemoryNodeRegistry();
    const world = (0, worldModule_1.createWorldModule)(artifactRepo);
    const character = new kvSteps_1.CharacterKvNode(artifactRepo);
    const outline = new memoSteps_1.OutlineMemoNode(artifactRepo);
    const script = new memoSteps_1.ScriptMemoNode(artifactRepo);
    const storyboard = new memoSteps_1.StoryboardMemoNode(artifactRepo);
    const charImage = new memoSteps_1.CharacterImageMemoNode(artifactRepo);
    const keyframes = new memoSteps_1.KeyframesMemoNode(artifactRepo);
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
    ];
    const nodesToRegister = [
        world.nodes.overview,
        ...Object.values(world.nodes.sections),
        character,
        outline,
        script,
        storyboard,
        charImage,
        keyframes
    ];
    for (const n of nodesToRegister)
        nodeRegistry.register(n);
    pipelineRegistry.register(new defaultPipeline_1.DefaultPipelineV01(steps));
    const defaultPipelineId = 'wf_v0_1_linear';
    const projectService = new projectService_1.ProjectService(userDataPath, pipelineRegistry, nodeRegistry, defaultPipelineId);
    const pipelineRunner = new runner_1.PipelineRunner({
        userDataPath,
        projectService,
        pipelineRegistry,
        nodeRegistry,
        memoStore,
        llm,
        runRepo,
        defaultPipelineId
    });
    const services = {
        artifactRepo,
        memoStore,
        llm,
        runRepo,
        pipelineRegistry,
        nodeRegistry,
        projectService,
        pipelineRunner
    };
    _servicesByPath.set(userDataPath, services);
    return services;
}

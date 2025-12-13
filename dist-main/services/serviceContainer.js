"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServices = getServices;
const projectService_1 = require("./projectService");
const llmService_1 = require("./llmService");
const runRepo_1 = require("./runRepo");
const capabilityOrchestrator_1 = require("./capabilityOrchestrator");
const core_1 = require("../core");
const builtin_1 = require("../capabilities/builtin");
let _servicesByPath = new Map();
function getServices(userDataPath) {
    const existing = _servicesByPath.get(userDataPath);
    if (existing)
        return existing;
    const llm = new llmService_1.LlmService(userDataPath);
    const runRepo = new runRepo_1.RunRepo(userDataPath);
    const eventBus = new core_1.InMemoryEventBus();
    const capabilityRegistry = new core_1.InMemoryCapabilityRegistry();
    (0, builtin_1.registerBuiltinCapabilities)(capabilityRegistry);
    const projectService = new projectService_1.ProjectService(userDataPath);
    const nodeTreeRepository = new core_1.SqliteNodeTreeRepository(userDataPath);
    const artifactStore = new core_1.SqliteVersionedArtifactStore(userDataPath);
    const orchestrator = new capabilityOrchestrator_1.CapabilityOrchestrator({
        artifactStore,
        nodeTree: nodeTreeRepository,
        capabilityRegistry,
        runRepo,
        eventBus
    });
    const services = {
        llm,
        runRepo,
        eventBus,
        capabilityRegistry,
        projectService,
        nodeTreeRepository,
        artifactStore,
        orchestrator
    };
    _servicesByPath.set(userDataPath, services);
    return services;
}

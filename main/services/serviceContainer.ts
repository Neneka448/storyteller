import { ProjectService } from './projectService'
import { LlmService } from './llmService'
import { RunRepo } from './runRepo'
import { CapabilityOrchestrator } from './capabilityOrchestrator'

import {
    InMemoryCapabilityRegistry,
    InMemoryEventBus,
    SqliteNodeTreeRepository,
    SqliteVersionedArtifactStore
} from '../core'
import { registerBuiltinCapabilities } from '../capabilities/builtin'

export type Services = {
    llm: LlmService
    runRepo: RunRepo
    eventBus: InMemoryEventBus
    capabilityRegistry: InMemoryCapabilityRegistry
    projectService: ProjectService
    nodeTreeRepository: SqliteNodeTreeRepository
    artifactStore: SqliteVersionedArtifactStore
    orchestrator: CapabilityOrchestrator
}

let _servicesByPath = new Map<string, Services>()

export function getServices(userDataPath: string): Services {
    const existing = _servicesByPath.get(userDataPath)
    if (existing) return existing

    const llm = new LlmService(userDataPath)
    const runRepo = new RunRepo(userDataPath)

    const eventBus = new InMemoryEventBus()
    const capabilityRegistry = new InMemoryCapabilityRegistry()
    registerBuiltinCapabilities(capabilityRegistry)

    const projectService = new ProjectService(userDataPath)
    const nodeTreeRepository = new SqliteNodeTreeRepository(userDataPath)
    const artifactStore = new SqliteVersionedArtifactStore(userDataPath)
    const orchestrator = new CapabilityOrchestrator({
        artifactStore,
        nodeTree: nodeTreeRepository,
        capabilityRegistry,
        runRepo,
        eventBus
    })

    const services: Services = {
        llm,
        runRepo,
        eventBus,
        capabilityRegistry,
        projectService,
        nodeTreeRepository,
        artifactStore,
        orchestrator
    }

    _servicesByPath.set(userDataPath, services)
    return services
}

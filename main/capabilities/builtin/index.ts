import type { CapabilityRegistry } from '../../core'

import { createKvCapability } from './kvCapability'
import { createMemoCapability } from './memoCapability'
import { createSandboxCapability } from './sandboxCapability'
import { createImageCapability } from './imageCapability'
import { createStoryboardCapability } from './storyboardCapability'

export function registerBuiltinCapabilities(registry: CapabilityRegistry) {
    // Use factories to avoid instantiating everything eagerly.
    registry.registerFactory('memo', () => createMemoCapability())
    registry.registerFactory('kv', () => createKvCapability())
    registry.registerFactory('sandbox', () => createSandboxCapability())
    registry.registerFactory('image', () => createImageCapability())
    registry.registerFactory('storyboard', () => createStoryboardCapability())
}

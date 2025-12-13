import KvPanel from './panels/KvPanel.vue'
import MemoPanel from './panels/MemoPanel.vue'
import SandboxPanel from './panels/SandboxPanel.vue'
import ImagePanel from './panels/ImagePanel.vue'
import StoryboardPanel from './panels/StoryboardPanel.vue'
import UnknownPanel from './panels/UnknownPanel.vue'

export const capabilityComponentRegistry: Record<string, any> = {
    KvPanel,
    MemoPanel,
    SandboxPanel,
    ImagePanel,
    StoryboardPanel,
    UnknownPanel
}

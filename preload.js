const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('storyteller', {
    version: () => '0.1.0',
    settings: {
        get: async () => ipcRenderer.invoke('settings:get'),
        set: async (partial) => ipcRenderer.invoke('settings:set', partial),
        testConnection: async () => ipcRenderer.invoke('settings:testConnection')
    },
    projects: {
        list: async () => ipcRenderer.invoke('project:list'),
        getActive: async () => ipcRenderer.invoke('project:getActive'),
        setActive: async (projectId) => ipcRenderer.invoke('project:setActive', projectId),
        create: async (name) => ipcRenderer.invoke('project:create', name),
        delete: async (projectId) => ipcRenderer.invoke('project:delete', projectId)
    },
    nodes: {
        list: async (projectId) => ipcRenderer.invoke('node:list', projectId)
    },
    capabilities: {
        list: async () => ipcRenderer.invoke('capability:list')
    },
    artifacts: {
        listVersions: async (projectId, nodeId, capabilityId) =>
            ipcRenderer.invoke('artifact:listVersions', projectId, nodeId, capabilityId),
        getAdopted: async (projectId, nodeId, capabilityId) =>
            ipcRenderer.invoke('artifact:getAdopted', projectId, nodeId, capabilityId),
        appendVersion: async (args) =>
            ipcRenderer.invoke('artifact:appendVersion', args),
        adoptVersion: async (projectId, nodeId, capabilityId, versionId) =>
            ipcRenderer.invoke('artifact:adoptVersion', projectId, nodeId, capabilityId, versionId)
    },
    runs: {
        list: async (projectId, limit) => ipcRenderer.invoke('run:list', projectId, limit),
        events: async (runId, limit) => ipcRenderer.invoke('run:events', runId, limit)
    },
    events: {
        on: (handler) => {
            const listener = (_event, e) => handler(e)
            ipcRenderer.on('app:event', listener)
            return () => ipcRenderer.removeListener('app:event', listener)
        }
    },
    runner: {
        runCapability: async (args) => ipcRenderer.invoke('runner:runCapability', args)
    },
    agent: {
        start: async (payload) => ipcRenderer.invoke('agent:start', payload),
        cancel: (streamId) => ipcRenderer.send('agent:cancel', { streamId }),
        onDelta: (handler) => {
            const listener = (_event, data) => handler(data);
            ipcRenderer.on('agent:delta', listener);
            return () => ipcRenderer.removeListener('agent:delta', listener);
        },
        onDone: (handler) => {
            const listener = (_event, data) => handler(data);
            ipcRenderer.on('agent:done', listener);
            return () => ipcRenderer.removeListener('agent:done', listener);
        },
        onError: (handler) => {
            const listener = (_event, data) => handler(data);
            ipcRenderer.on('agent:error', listener);
            return () => ipcRenderer.removeListener('agent:error', listener);
        },
        onToolCall: (handler) => {
            const listener = (_event, data) => handler(data);
            ipcRenderer.on('agent:tool_call', listener);
            return () => ipcRenderer.removeListener('agent:tool_call', listener);
        }
    }
});

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
    steps: {
        list: async (projectId) => ipcRenderer.invoke('step:list', projectId)
    },
    artifacts: {
        listVersions: async (projectId, stepId) =>
            ipcRenderer.invoke('artifact:listVersions', projectId, stepId),
        getAdopted: async (projectId, stepId) =>
            ipcRenderer.invoke('artifact:getAdopted', projectId, stepId),
        appendTextVersion: async (projectId, stepId, contentText) =>
            ipcRenderer.invoke('artifact:appendTextVersion', projectId, stepId, contentText),
        adoptVersion: async (projectId, stepId, versionId) =>
            ipcRenderer.invoke('artifact:adoptVersion', projectId, stepId, versionId)
    },
    pipeline: {
        runStep: async (args) => ipcRenderer.invoke('pipeline:runStep', args)
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

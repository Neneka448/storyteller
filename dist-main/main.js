"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = start;
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const settingsRepo_1 = require("./db/settingsRepo");
const agentRunner_1 = require("./agent/agentRunner");
const serviceContainer_1 = require("./services/serviceContainer");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const agentStreams = new Map();
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: node_path_1.default.join(__dirname, '../preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    if (VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(VITE_DEV_SERVER_URL);
    }
    else {
        mainWindow.loadFile(node_path_1.default.join(__dirname, '../renderer/dist/index.html'));
    }
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
}
function registerIpc() {
    const userDataPath = electron_1.app.getPath('userData');
    const { projectService: projectSvc, artifactStore, orchestrator, capabilityRegistry, eventBus, runRepo } = (0, serviceContainer_1.getServices)(userDataPath);
    // Forward core events to renderer (incremental refresh + diagnostics)
    const forward = (type) => eventBus.on(type, (payload) => {
        for (const w of electron_1.BrowserWindow.getAllWindows()) {
            try {
                w.webContents.send('app:event', { type, payload });
            }
            catch {
                // ignore
            }
        }
    });
    forward('run:start');
    forward('run:succeeded');
    forward('run:failed');
    forward('artifact:appended');
    forward('artifact:adopted');
    forward('agent:tool.call');
    forward('agent:tool.result');
    forward('agent:tool.error');
    forward('data:changed');
    electron_1.ipcMain.handle('settings:get', async () => (0, settingsRepo_1.getSettings)({ userDataPath: electron_1.app.getPath('userData') }));
    electron_1.ipcMain.handle('settings:set', async (_event, partial) => (0, settingsRepo_1.setSettings)({ userDataPath: electron_1.app.getPath('userData') }, partial));
    electron_1.ipcMain.handle('settings:testConnection', async () => {
        const s = (0, settingsRepo_1.getSettings)({ userDataPath: electron_1.app.getPath('userData') });
        const model = String(s?.model || '').trim();
        const apiKey = String(s?.apiKey || '').trim() || String(process.env.STORYTELLER_LLM_API_KEY || '').trim();
        const url = (0, settingsRepo_1.resolveChatCompletionsURL)(s);
        if (!apiKey) {
            return {
                ok: false,
                status: 0,
                url,
                bodyPreview: 'Missing API key'
            };
        }
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                stream: false,
                messages: [{ role: 'user', content: 'ping' }]
            })
        });
        const text = await res.text().catch(() => '');
        const ct = String(res.headers.get('content-type') || '');
        const looksLikeHtml = /text\/html/i.test(ct) || /^\s*<!DOCTYPE html>/i.test(text);
        const bodyPreview = (text || '').slice(0, 2000);
        return {
            ok: res.ok && !looksLikeHtml,
            status: res.status,
            url,
            bodyPreview: looksLikeHtml ? `Got HTML instead of JSON.\n\n${bodyPreview}` : bodyPreview
        };
    });
    // Projects
    electron_1.ipcMain.handle('project:list', async () => projectSvc.listProjects());
    electron_1.ipcMain.handle('project:getActive', async () => {
        const id = projectSvc.getActiveProjectId();
        if (!id)
            return null;
        return projectSvc.getProject(id);
    });
    electron_1.ipcMain.handle('project:setActive', async (_e, projectId) => {
        projectSvc.setActiveProjectId(String(projectId));
        return { ok: true };
    });
    electron_1.ipcMain.handle('project:create', async (_e, name) => projectSvc.createProject(name));
    electron_1.ipcMain.handle('project:delete', async (_e, projectId) => {
        projectSvc.deleteProject(String(projectId));
        return { ok: true };
    });
    // Nodes (was Steps)
    electron_1.ipcMain.handle('node:list', async (_e, projectId) => projectSvc.listNodes(String(projectId)));
    // Capabilities
    electron_1.ipcMain.handle('capability:list', async () => capabilityRegistry.list().map((c) => ({ id: c.id, render: c.render ?? null })));
    // Artifacts (versioned, by nodeId+capabilityId)
    electron_1.ipcMain.handle('artifact:listVersions', async (_e, projectId, nodeId, capabilityId) => artifactStore.listVersions({
        projectId: String(projectId),
        nodeId: String(nodeId),
        capabilityId: String(capabilityId)
    }));
    electron_1.ipcMain.handle('artifact:getAdopted', async (_e, projectId, nodeId, capabilityId) => artifactStore.getAdopted({
        projectId: String(projectId),
        nodeId: String(nodeId),
        capabilityId: String(capabilityId)
    }));
    electron_1.ipcMain.handle('artifact:appendVersion', async (_e, args) => artifactStore.appendVersion({
        projectId: String(args.projectId),
        nodeId: String(args.nodeId),
        capabilityId: String(args.capabilityId),
        contentType: args.contentType,
        contentText: args.contentText ?? null,
        contentJson: args.contentJson,
        contentUrl: args.contentUrl ?? null,
        meta: args.meta ?? null,
        adopt: Boolean(args.adopt)
    }));
    electron_1.ipcMain.handle('artifact:adoptVersion', async (_e, projectId, nodeId, capabilityId, versionId) => artifactStore.adoptVersion({
        projectId: String(projectId),
        nodeId: String(nodeId),
        capabilityId: String(capabilityId),
        versionId: String(versionId)
    }));
    // Pipeline
    // Legacy pipeline runner removed in refactor; new orchestrator will be introduced next.
    // Runner (Capability Orchestrator)
    electron_1.ipcMain.handle('runner:runCapability', async (_e, args) => orchestrator.runCapability(args));
    // Observability
    electron_1.ipcMain.handle('run:list', async (_e, projectId, limit) => runRepo.listRuns({ projectId: String(projectId), limit }));
    electron_1.ipcMain.handle('run:events', async (_e, runId, limit) => runRepo.listEvents({ runId: String(runId), limit }));
    // Agent
    electron_1.ipcMain.handle('agent:start', async (event, payload) => {
        const streamId = (0, node_crypto_1.randomUUID)();
        const controller = new AbortController();
        const messages = Array.isArray(payload?.messages) ? payload.messages : [];
        agentStreams.set(streamId, controller);
        (0, agentRunner_1.runAgent)({
            userDataPath: electron_1.app.getPath('userData'),
            webContents: event.sender,
            streamId,
            messages,
            signal: controller.signal
        }).finally(() => {
            agentStreams.delete(streamId);
        });
        return streamId;
    });
    electron_1.ipcMain.on('agent:cancel', (_event, payload) => {
        const streamId = payload?.streamId;
        if (!streamId)
            return;
        const controller = agentStreams.get(streamId);
        if (!controller)
            return;
        controller.abort();
        agentStreams.delete(streamId);
    });
}
function start() {
    electron_1.app.whenReady().then(() => {
        registerIpc();
        createWindow();
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0)
                createWindow();
        });
    });
    electron_1.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin')
            electron_1.app.quit();
    });
}

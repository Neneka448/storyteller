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
    const { projectService: projectSvc, memoStore: artifactSvc, pipelineRunner } = (0, serviceContainer_1.getServices)(userDataPath);
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
    // Steps
    electron_1.ipcMain.handle('step:list', async (_e, projectId) => projectSvc.listSteps(String(projectId)));
    // Artifacts (memo versions)
    electron_1.ipcMain.handle('artifact:listVersions', async (_e, projectId, stepId) => artifactSvc.listVersions(String(projectId), String(stepId)));
    electron_1.ipcMain.handle('artifact:getAdopted', async (_e, projectId, stepId) => artifactSvc.getAdopted(String(projectId), String(stepId)));
    electron_1.ipcMain.handle('artifact:appendTextVersion', async (_e, projectId, stepId, contentText) => artifactSvc.appendTextVersion(String(projectId), String(stepId), String(contentText ?? '')));
    electron_1.ipcMain.handle('artifact:adoptVersion', async (_e, projectId, stepId, versionId) => artifactSvc.adoptVersion(String(projectId), String(stepId), String(versionId)));
    // Pipeline
    electron_1.ipcMain.handle('pipeline:runStep', async (_e, args) => pipelineRunner.runStep(args));
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

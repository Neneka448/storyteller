import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'

import { randomUUID } from 'node:crypto'

import { getSettings, setSettings, resolveChatCompletionsURL } from './db/settingsRepo'
import { runAgent } from './agent/agentRunner'
import { getServices } from './services/serviceContainer'

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

const agentStreams = new Map<string, AbortController>()

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, '../preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    if (VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(VITE_DEV_SERVER_URL)
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'))
    }

    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
}

function registerIpc() {
    const userDataPath = app.getPath('userData')
    const { projectService: projectSvc, memoStore: artifactSvc, pipelineRunner } = getServices(userDataPath)

    ipcMain.handle('settings:get', async () => getSettings({ userDataPath: app.getPath('userData') }))
    ipcMain.handle('settings:set', async (_event, partial) =>
        setSettings({ userDataPath: app.getPath('userData') }, partial)
    )

    ipcMain.handle('settings:testConnection', async () => {
        const s = getSettings({ userDataPath: app.getPath('userData') })
        const model = String(s?.model || '').trim()
        const apiKey = String(s?.apiKey || '').trim() || String(process.env.STORYTELLER_LLM_API_KEY || '').trim()

        const url = resolveChatCompletionsURL(s)

        if (!apiKey) {
            return {
                ok: false,
                status: 0,
                url,
                bodyPreview: 'Missing API key'
            }
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
        })

        const text = await res.text().catch(() => '')
        const ct = String(res.headers.get('content-type') || '')
        const looksLikeHtml = /text\/html/i.test(ct) || /^\s*<!DOCTYPE html>/i.test(text)
        const bodyPreview = (text || '').slice(0, 2000)

        return {
            ok: res.ok && !looksLikeHtml,
            status: res.status,
            url,
            bodyPreview: looksLikeHtml ? `Got HTML instead of JSON.\n\n${bodyPreview}` : bodyPreview
        }
    })

    // Projects
    ipcMain.handle('project:list', async () => projectSvc.listProjects())
    ipcMain.handle('project:getActive', async () => {
        const id = projectSvc.getActiveProjectId()
        if (!id) return null
        return projectSvc.getProject(id)
    })
    ipcMain.handle('project:setActive', async (_e, projectId: string) => {
        projectSvc.setActiveProjectId(String(projectId))
        return { ok: true }
    })
    ipcMain.handle('project:create', async (_e, name?: string) => projectSvc.createProject(name))
    ipcMain.handle('project:delete', async (_e, projectId: string) => {
        projectSvc.deleteProject(String(projectId))
        return { ok: true }
    })

    // Steps
    ipcMain.handle('step:list', async (_e, projectId: string) => projectSvc.listSteps(String(projectId)))

    // Artifacts (memo versions)
    ipcMain.handle('artifact:listVersions', async (_e, projectId: string, stepId: string) =>
        artifactSvc.listVersions(String(projectId), String(stepId))
    )
    ipcMain.handle('artifact:getAdopted', async (_e, projectId: string, stepId: string) =>
        artifactSvc.getAdopted(String(projectId), String(stepId))
    )
    ipcMain.handle('artifact:appendTextVersion', async (_e, projectId: string, stepId: string, contentText: string) =>
        artifactSvc.appendTextVersion(String(projectId), String(stepId), String(contentText ?? ''))
    )
    ipcMain.handle('artifact:adoptVersion', async (_e, projectId: string, stepId: string, versionId: string) =>
        artifactSvc.adoptVersion(String(projectId), String(stepId), String(versionId))
    )

    // Pipeline
    ipcMain.handle('pipeline:runStep', async (_e, args: any) => pipelineRunner.runStep(args))

    // Agent
    ipcMain.handle('agent:start', async (event, payload) => {
        const streamId = randomUUID()
        const controller = new AbortController()

        const messages = Array.isArray(payload?.messages) ? payload.messages : []

        agentStreams.set(streamId, controller)

        runAgent({
            userDataPath: app.getPath('userData'),
            webContents: event.sender,
            streamId,
            messages,
            signal: controller.signal
        }).finally(() => {
            agentStreams.delete(streamId)
        })

        return streamId
    })

    ipcMain.on('agent:cancel', (_event, payload) => {
        const streamId = payload?.streamId
        if (!streamId) return
        const controller = agentStreams.get(streamId)
        if (!controller) return
        controller.abort()
        agentStreams.delete(streamId)
    })
}

export function start() {
    app.whenReady().then(() => {
        registerIpc()
        createWindow()

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow()
        })
    })

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
    })
}

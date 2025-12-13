import { getDb } from './sqlite'

export type LlmSettings = {
    baseUrl: string
    pathPrefix: string
    model: string
    apiKey: string
    // legacy
    endpoint?: string
}

export const DEFAULTS: LlmSettings = {
    baseUrl: 'https://api.openai.com',
    pathPrefix: '',
    model: 'gpt-4.1-mini',
    apiKey: ''
}

function normalizeBaseUrl(raw: unknown): string {
    const input = String(raw ?? '').trim()
    if (!input) return DEFAULTS.baseUrl
    try {
        const u = new URL(input)
        const pathname = (u.pathname || '').replace(/\/$/, '')
        return `${u.protocol}//${u.host}${pathname}`
    } catch {
        return DEFAULTS.baseUrl
    }
}

function normalizePathPrefix(raw: unknown): string {
    return String(raw ?? '').trim()
}

function baseUrlAlreadyIncludesV1(baseUrl: string): boolean {
    try {
        const u = new URL(String(baseUrl || '').trim())
        return /(^|\/)v1(\/|$)/.test(u.pathname || '')
    } catch {
        return false
    }
}

function defaultPathPrefix(): string {
    return '/v1'
}

export function resolveBaseURL(s: Pick<LlmSettings, 'baseUrl' | 'pathPrefix'>): string {
    const base = normalizeBaseUrl(s.baseUrl).replace(/\/$/, '')
    const prefixRaw = normalizePathPrefix(s.pathPrefix)

    // Path 不留空：完全照抄
    if (prefixRaw) return `${base}${prefixRaw}`

    // 留空：默认补 /v1；如果 baseUrl 已经包含 /v1，则不再重复追加
    if (baseUrlAlreadyIncludesV1(base)) return base
    return `${base}${defaultPathPrefix()}`
}

export function resolveChatCompletionsURL(s: Pick<LlmSettings, 'baseUrl' | 'pathPrefix'>): string {
    return `${resolveBaseURL(s)}/chat/completions`
}

function splitEndpointToParts(endpoint: string): Pick<LlmSettings, 'baseUrl' | 'pathPrefix'> {
    try {
        const u = new URL(String(endpoint || '').trim())
        const origin = `${u.protocol}//${u.host}`
        const p = (u.pathname || '').replace(/\/$/, '')

        const m = p.match(/^(.*?)(\/v1)(\/|$)/)
        if (m) {
            const pre = (m[1] || '').replace(/\/$/, '')
            return { baseUrl: `${origin}${pre}`, pathPrefix: '' }
        }

        return { baseUrl: `${origin}${p}`, pathPrefix: '' }
    } catch {
        return { baseUrl: DEFAULTS.baseUrl, pathPrefix: DEFAULTS.pathPrefix }
    }
}

export function getSettings(opts: { userDataPath: string }): LlmSettings {
    const db = getDb({ userDataPath: opts.userDataPath })
    const row = db.prepare('SELECT value FROM kv WHERE key = ?').get('settings.llm')
    if (!row?.value) return { ...DEFAULTS }

    try {
        const parsed = JSON.parse(row.value)

        let baseUrl = typeof parsed.baseUrl === 'string' ? normalizeBaseUrl(parsed.baseUrl) : DEFAULTS.baseUrl
        let pathPrefix =
            typeof parsed.pathPrefix === 'string' ? normalizePathPrefix(parsed.pathPrefix) : DEFAULTS.pathPrefix

        if (typeof parsed.endpoint === 'string' && (!parsed.baseUrl || !parsed.pathPrefix)) {
            const parts = splitEndpointToParts(parsed.endpoint)
            baseUrl = parts.baseUrl
            pathPrefix = parts.pathPrefix
        }

        const normalized: LlmSettings = {
            baseUrl,
            pathPrefix,
            model: typeof parsed.model === 'string' ? parsed.model : DEFAULTS.model,
            apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : DEFAULTS.apiKey,
            endpoint: typeof parsed.endpoint === 'string' ? parsed.endpoint : undefined
        }

        const needsWriteBack =
            parsed.baseUrl !== normalized.baseUrl ||
            parsed.pathPrefix !== normalized.pathPrefix ||
            (typeof parsed.endpoint === 'string' && (parsed.baseUrl == null || parsed.pathPrefix == null))

        if (needsWriteBack) {
            db.prepare(
                'INSERT INTO kv(key, value, updated_at) VALUES(?, ?, ?)\n         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
            ).run('settings.llm', JSON.stringify(normalized), Date.now())
        }

        return normalized
    } catch {
        return { ...DEFAULTS }
    }
}

export function setSettings(opts: { userDataPath: string }, partial: Partial<LlmSettings>): LlmSettings {
    const current = getSettings({ userDataPath: opts.userDataPath })
    let next: LlmSettings = { ...current, ...partial }

    if (typeof (partial as any)?.endpoint === 'string') {
        const parts = splitEndpointToParts((partial as any).endpoint)
        next.baseUrl = parts.baseUrl
        next.pathPrefix = parts.pathPrefix
    }

    next.baseUrl = normalizeBaseUrl(next.baseUrl)
    next.pathPrefix = normalizePathPrefix(next.pathPrefix)

    const db = getDb({ userDataPath: opts.userDataPath })
    db.prepare(
        'INSERT INTO kv(key, value, updated_at) VALUES(?, ?, ?)\n     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
    ).run('settings.llm', JSON.stringify(next), Date.now())

    return next
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmService = void 0;
const settingsRepo_1 = require("../db/settingsRepo");
class LlmService {
    userDataPath;
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
    }
    async generateText(args) {
        const s = (0, settingsRepo_1.getSettings)({ userDataPath: this.userDataPath });
        const apiKey = String(s.apiKey || '').trim() || String(process.env.STORYTELLER_LLM_API_KEY || '').trim();
        if (!apiKey)
            throw new Error('Missing API key');
        const model = String(s.model || '').trim() || String(process.env.STORYTELLER_LLM_MODEL || '').trim() || 'gpt-4.1-mini';
        const url = (0, settingsRepo_1.resolveChatCompletionsURL)(s);
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                stream: false,
                temperature: typeof args.temperature === 'number' ? args.temperature : 0.7,
                messages: [
                    { role: 'system', content: String(args.system || '') },
                    { role: 'user', content: String(args.user || '') }
                ]
            })
        });
        const text = await res.text().catch(() => '');
        if (!res.ok) {
            throw new Error(`LLM request failed: ${res.status}\n${text.slice(0, 2000)}`);
        }
        let json;
        try {
            json = JSON.parse(text);
        }
        catch {
            throw new Error(`LLM response is not JSON: ${text.slice(0, 2000)}`);
        }
        const content = json?.choices?.[0]?.message?.content;
        if (typeof content === 'string')
            return content;
        // Some providers return different shape; best-effort fallback.
        const alt = json?.output_text;
        if (typeof alt === 'string')
            return alt;
        throw new Error('LLM response missing message content');
    }
}
exports.LlmService = LlmService;

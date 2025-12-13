"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorldModule = createWorldModule;
const kvSteps_1 = require("../../nodes/impl/kvSteps");
function createWorldModule(artifactRepo) {
    const overview = new kvSteps_1.WorldKvNode(artifactRepo);
    const sections = [
        { key: 'geo', stepId: 'world_geo', title: '地理与环境｜地形设定档', type: 'kv.world.geo' },
        { key: 'climate', stepId: 'world_climate', title: '地理与环境｜气候与自然灾害', type: 'kv.world.climate' },
        { key: 'flora_fauna', stepId: 'world_ecology', title: '生物生态｜植被与动物生态', type: 'kv.world.ecology' },
        { key: 'monsters', stepId: 'world_monsters', title: '生物生态｜物种/怪物设定', type: 'kv.world.monsters' },
        { key: 'social_class', stepId: 'world_social_class', title: '社会与文明｜社会阶层结构', type: 'kv.world.social_class' },
        { key: 'politics_law', stepId: 'world_politics_law', title: '社会与文明｜政治制度与法律规范', type: 'kv.world.politics_law' },
        { key: 'economy_trade', stepId: 'world_economy_trade', title: '社会与文明｜经济系统/贸易网络', type: 'kv.world.economy_trade' },
        { key: 'values_taboos', stepId: 'world_values_taboos', title: '文化与日常生活｜价值观与禁忌', type: 'kv.world.values_taboos' },
        { key: 'language', stepId: 'world_language', title: '文化与日常生活｜语言与交流体系', type: 'kv.world.language' },
        { key: 'religion', stepId: 'world_religion', title: '文化与日常生活｜宗教与神话体系', type: 'kv.world.religion' },
        { key: 'chronicle', stepId: 'world_chronicle', title: '历史与传承｜编年史', type: 'kv.world.chronicle' },
        { key: 'legends', stepId: 'world_legends', title: '历史与传承｜英雄/传奇人物', type: 'kv.world.legends' },
        { key: 'system_rules', stepId: 'world_system_rules', title: '技术与系统｜魔法/科技系统规则', type: 'kv.world.system_rules' },
        { key: 'resources', stepId: 'world_resources', title: '技术与系统｜能源/资源背书', type: 'kv.world.resources' },
        { key: 'daily', stepId: 'world_daily', title: '细节沉浸｜日常生活图谱', type: 'kv.world.daily' },
        { key: 'festivals', stepId: 'world_festivals', title: '细节沉浸｜习俗/节庆/礼仪日历', type: 'kv.world.festivals' }
    ];
    const sectionNodes = {};
    for (const s of sections) {
        sectionNodes[s.key] = new kvSteps_1.WorldKvSectionNode(artifactRepo, { type: s.type, sectionTitle: s.title });
    }
    const steps = [
        {
            stepId: 'step_world',
            title: '世界观总览（KV）',
            node: overview,
            initialArtifactSummary: 'KV（待补充）'
        },
        ...sections.map((s) => ({
            stepId: s.stepId,
            title: s.title,
            node: sectionNodes[s.key],
            initialArtifactSummary: 'KV（待补充）'
        }))
    ];
    return { nodes: { overview, sections: sectionNodes }, steps };
}

# 05. 大模型交互协议 (LLM Interaction Protocol)

## 1. 核心理念：Capability as Tool (能力即工具)

Storyteller 不预设 LLM 的行为，而是通过 **Function Calling (工具调用)** 让 LLM 自主探索和操作节点。每个 Capability 的 `Agent Facet` 负责将自身能力翻译成 LLM 能理解的 Tool Definition。

## 2. ICallableTool 接口

```typescript
interface ICallableTool {
  // 返回工具定义列表
  getTools(): AgentToolDefinition[];
  
  // 执行工具
  invokeTool(toolName: string, args: any, ctx: ToolContext): Promise<any>;
}
```

### 示例：KvCapability 的工具定义
```json
{
  "name": "update_node_kv",
  "description": "Update the Key-Value data of the current node. Use this to store structured settings.",
  "parameters": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": { "type": "object", "properties": { "k": "string", "v": "string" } }
      }
    }
  }
}
```

## 3. Schema 注入与 Prompt 构建

为了让 LLM 知道当前节点能干什么、数据格式是什么，Runner 会在 System Prompt 中动态注入 Schema。

**System Prompt 模板示例**：
```text
You are a creative assistant. You are currently editing Node: "{node.title}".

Available Capabilities:
1. [KV Store]: Stores structured attributes.
   Schema: { items: [{k, v}] }
2. [Image Generator]: Generates visuals.
   Schema: { prompt: string, ratio: string }

Current Data (Adopted Version):
- KV: { items: [{k: "Name", v: "Neo"}] }
- Image: (Empty)

User Instruction: {instruction}
```

## 4. 自动化任务执行流 (The Loop)

当用户发送指令（如“把主角名字改成 Neo 并生成一张头像”）时：

1. **Context Assembly**: Runner 收集当前节点 Capabilities、Schema 和当前数据，构建 Prompt。
2. **LLM Inference**: LLM 分析指令，决定调用工具。
   - Call `update_node_kv({ items: [{k: "Name", v: "Neo"}] })`
   - Call `generate_image({ prompt: "Neo, cyberpunk style" })`
3. **Tool Execution**: 
   - `KvCapability` 执行更新 -> 写入新版本 -> 触发 `data:changed`。
   - `GenImageCapability` 执行生图 -> 写入新版本 -> 触发 `data:changed`。
4. **Feedback**: Runner 将工具执行结果返回给 LLM。
5. **Completion**: LLM 输出最终回复（"已更新名字并生成头像"）。

## 5. 错误处理与重试

- **Schema Validation**: 如果 LLM 生成的参数不符合 Schema，`ISchemaProvider.validate` 会失败，Runner 将错误信息反馈给 LLM，要求其重试 (Self-Correction)。
- **Runtime Error**: 如果工具执行失败（如生图 API 超时），错误也会反馈给 LLM，LLM 可选择重试或告知用户。

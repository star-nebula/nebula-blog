---
title: LangChain-工具型Agent
abstract: LangChain Agent 通过 bind_tools 绑定函数，根据 tool_calls 执行工具并把结果回填给模型。
created: 2026-10-19
updated: 2026-10-19
tags: [LangChain, Agent, Tool-Calling, Function-Call]
type: 概念解释
related:
  - "[[🧩 AI框架与Agent-MOC]]"
  - "[[Function Call 实战]]"
  - "[[AI Agent 概述]]"
  - "[[LangChain-RAG与Agent全链路实战]]"
reference:
  - "[[Resources/人工智能/LangChain-Prompt-RAG全链路实战]]"
category: ["🧩 AI框架与Agent"]
---

# LangChain-工具型Agent

工具型 Agent 的关键不是一次模型调用，而是“模型决策、工具执行、结果回填、再次生成”的循环。

```python
model_with_tools = model.bind_tools([
    add,
    multiply,
])
```

原文示例执行流程：

1. 用 `bind_tools` 给 `qwen-plus` 绑定 `add` 和 `multiply`。
2. 模型返回 `tool_calls`，说明需要执行哪些工具及参数。
3. 应用执行对应函数。
4. 把工具结果加入消息上下文。
5. 再次调用模型生成最终回答。

实际接入时应限制工具权限，并校验模型生成的参数，避免执行未授权或危险操作。

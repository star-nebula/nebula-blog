---
title: LangChain-LangSmith追踪
abstract: LangChain 通过 LANGCHAIN_ 环境变量接入 LangSmith，对模型调用和链路执行进行追踪。
created: 2026-10-19
updated: 2026-10-19
tags: [LangChain, LangSmith, 可观测性, 追踪]
type: 步骤操作
related:
  - "[[🧩 AI框架与Agent-MOC]]"
  - "[[LangChain-RAG与Agent全链路实战]]"
reference:
  - "[[Resources/人工智能/LangChain-Prompt-RAG全链路实战]]"
category: ["🧩 AI框架与Agent"]
---

# LangChain-LangSmith追踪

原文通过四个环境变量接入 LangSmith：

```text
LANGCHAIN_TRACING_V2
LANGCHAIN_ENDPOINT
LANGCHAIN_API_KEY
LANGCHAIN_PROJECT
```

配置后，模型调用会进入指定 LangSmith 项目，用于查看调用链、输入输出和运行状态。

使用要点：

- API Key 只放环境变量或凭据管理系统，不写入笔记和代码仓库。
- 为不同应用设置独立 `LANGCHAIN_PROJECT`，便于区分追踪数据。
- 生产环境应评估聊天内容、提示词和工具参数进入追踪平台后的隐私边界。

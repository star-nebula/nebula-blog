---
title: LangChain-RAG与Agent全链路实战
abstract: LangChain 从提示词模板、结构化输出、文本切分与 Embedding，到 Milvus RAG、工具型 Agent 和 LangSmith 追踪的完整实践路线。
created: 2026-10-19
updated: 2026-10-19
tags: [LangChain, RAG, Milvus, Embedding, Agent, LangSmith]
type: 步骤操作
related:
  - "[[🧩 AI框架与Agent-MOC]]"
  - "[[🔍 RAG-MOC]]"
reference:
  - "[[Resources/人工智能/LangChain-Prompt-RAG全链路实战]]"
source_type: 网页技术教程
source_path: Resources/人工智能/LangChain-Prompt-RAG全链路实战.md
category: ["🧩 AI框架与Agent"]
---

# LangChain-RAG与Agent全链路实战

本页串联 LangChain 的主要实践环节：

1. 用 [[LangChain-PromptTemplate变量填充]] 构造提示词，并用 LCEL 组合模型与输出解析。
2. 用 [[LangChain-结构化输出与修复解析]] 把模型结果变成稳定结构，并处理格式错误。
3. 用 [[LangChain-文本切分与Embedding]] 控制检索粒度并生成向量。
4. 用 [[LangChain-Milvus-RAG链路]] 完成文档加载、入库、检索和回答生成。
5. 用 [[LangChain-工具型Agent]] 让模型规划并调用函数。
6. 用 [[LangChain-LangSmith追踪]] 观察调用链和调试运行过程。

主线：`Prompt → LLM → Parser → 文档切分 → Embedding → 向量库 → 检索 → LLM`。工具 Agent 与 LangSmith 分别补充执行和观测能力。

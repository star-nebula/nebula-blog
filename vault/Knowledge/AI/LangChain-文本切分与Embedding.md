---
title: LangChain-文本切分与Embedding
abstract: 文本切分参数决定检索粒度，Embedding 将文本块转换为可供向量数据库检索的表示。
created: 2026-10-19
updated: 2026-10-19
tags: [LangChain, 文本切分, Embedding, RAG]
type: 概念解释
related:
  - "[[🔍 RAG-MOC]]"
  - "[[LangChain-RAG与Agent全链路实战]]"
  - "[[RAG 概述]]"
reference:
  - "[[Resources/人工智能/LangChain-Prompt-RAG全链路实战]]"
category: ["🔍 RAG"]
---

# LangChain-文本切分与Embedding

文本进入向量库前需要先切分。原文示例建议：

- `chunk_size` 取 500～1000 个字符。
- `chunk_overlap` 取 `chunk_size` 的 10%～20%。
- 针对代码或结构化文本，使用语言专属分割器，减少语义边界被破坏。

嵌入示例使用 `DashScopeEmbeddings` 的 `text-embedding-v2` 模型。

```python
embeddings = DashScopeEmbeddings(model="text-embedding-v2")
vector = embeddings.embed_query("待检索文本")
```

切分粒度和 Embedding 模型会影响召回质量。索引与查询应使用一致的向量化方案。

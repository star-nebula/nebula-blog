---
title: LangChain-Milvus-RAG链路
abstract: 将网页加载、文本切分、Embedding、Milvus 入库、检索和模型回答串成一条 RAG 链路。
created: 2026-10-19
updated: 2026-10-19
tags: [LangChain, RAG, Milvus, 向量检索]
type: 步骤操作
related:
  - "[[🔍 RAG-MOC]]"
  - "[[Milvus 向量数据库]]"
  - "[[RAG 概述]]"
  - "[[LangChain-RAG与Agent全链路实战]]"
reference:
  - "[[Resources/人工智能/LangChain-Prompt-RAG全链路实战]]"
category: ["🔍 RAG"]
---

# LangChain-Milvus-RAG链路

构建顺序：

1. `WebBaseLoader` 加载网页文档。
2. `CharacterTextSplitter` 切分文本，示例参数为 `chunk_size=1024`、`chunk_overlap=20`。
3. 使用 `text-embedding-v2` 生成向量。
4. 将文本块与向量写入 Milvus 集合 `doc_qa_db`。
5. 检索相关片段，将上下文交给 `qwen-plus` 生成回答。

```python
docs = WebBaseLoader(url).load()
chunks = CharacterTextSplitter(
    chunk_size=1024,
    chunk_overlap=20,
).split_documents(docs)
```


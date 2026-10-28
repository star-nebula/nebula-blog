---
title: LangChain-PromptTemplate变量填充
abstract: PromptTemplate 通过固定模板与动态变量生成提示词，支持 format、invoke 和 partial_variables。
created: 2026-10-19
updated: 2026-10-19
tags: [LangChain, Prompt, PromptTemplate]
type: 概念解释
related:
  - "[[🧩 AI框架与Agent-MOC]]"
  - "[[LangChain Prompts 组件]]"
  - "[[LangChain-RAG与Agent全链路实战]]"
reference:
  - "[[Resources/人工智能/LangChain-Prompt-RAG全链路实战]]"
category: ["🧩 AI框架与Agent"]
---

# LangChain-PromptTemplate变量填充

`PromptTemplate` 把提示词拆成固定模板和 `{变量}` 占位符，再用输入数据生成最终提示词。

```python
prompt = PromptTemplate(
    template=template,
    input_variables=["domain", "language", "question"],
)

prompt.format(
    domain="机器学习",
    language="中文",
    question="如何使用 LangChain？",
)
```

- `format` 按变量名填充模板。
- `invoke` 也可用字典填充模板变量。
- `partial_variables` 可以预置固定值，减少重复传参。

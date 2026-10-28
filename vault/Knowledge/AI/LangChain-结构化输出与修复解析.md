---
title: LangChain-结构化输出与修复解析
abstract: 使用 PydanticOutputParser 将模型输出解析为结构化对象，并用 OutputFixingParser 修复格式错误。
created: 2026-10-19
updated: 2026-10-19
tags: [LangChain, Pydantic, OutputParser, 结构化输出]
type: 步骤操作
related:
  - "[[🧩 AI框架与Agent-MOC]]"
  - "[[LangChain-RAG与Agent全链路实战]]"
reference:
  - "[[Resources/人工智能/LangChain-Prompt-RAG全链路实战]]"
category: ["🧩 AI框架与Agent"]
---

# LangChain-结构化输出与修复解析

1. 定义 Pydantic 模型描述目标字段。
2. 用 `PydanticOutputParser` 生成解析器，并把 `format_instructions` 注入提示词。
3. 将模型文本解析为对象，再按需转为字典或 JSON。

```python
parser = PydanticOutputParser(pydantic_object=UserInfo)

prompt = PromptTemplate(
    template=template,
    partial_variables={
        "format_instructions": parser.get_format_instructions(),
    },
)
```

格式错误时，`OutputFixingParser` 调用模型修复，再交给原解析器处理：

```python
fixing_parser = OutputFixingParser.from_llm(
    parser=parser,
    llm=model,
    max_retries=3,
)
```


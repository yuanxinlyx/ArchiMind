"""

Multi-Agent Architecture Discussion System - Backend

Supports multiple providers and per-agent provider configuration.

"""

import os

import json

import asyncio

from typing import AsyncGenerator, Optional



from fastapi import FastAPI, HTTPException

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field

from sse_starlette.sse import EventSourceResponse

from dotenv import load_dotenv

from openai import AsyncOpenAI



load_dotenv()



app = FastAPI(title="Multi-Agent Discussion System")



app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "http://localhost:5173",

        "http://127.0.0.1:5173",

        "http://localhost:3000",

    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)



# Import shared models and utilities

from shared import (

    Agent, ProviderSettings, default_client, DEFAULT_MODEL,

    get_client_for_agent, get_client, stance_instruction,

    truncate_history_by_chars,

)





# ============ Models (additional) ============





class DiscussionConfig(BaseModel):

    topic: str

    agents: list[Agent]

    # rounds=0 is allowed: skips discussion and only generates the final summary

    # (see the rounds==0 branch in discussion_stream below)

    rounds: int = Field(default=3, ge=0, le=20)

    language: str = "zh"

    default_provider_id: Optional[str] = None

    summary_provider_id: Optional[str] = None  # provider for final summary

    providers: Optional[dict[str, ProviderSettings]] = None

    existing_history: Optional[list[dict]] = None

    user_feedback: Optional[list[str]] = None

    start_round: Optional[int] = None





class FetchModelsRequest(BaseModel):

    baseUrl: str

    apiKey: str = ""





class TestConnectionRequest(BaseModel):

    apiKey: str

    baseUrl: str = "https://api.openai.com/v1"

    model: str = "gpt-4"





# ============ Core Logic ============



# _truncate_history_by_chars is now in shared.py as truncate_history_by_chars





async def generate_agent_response(

    client: AsyncOpenAI,

    model: str,

    agent: Agent,

    topic: str,

    discussion_history: list[dict],

    round_num: int,

    total_rounds: int,

    max_tokens: Optional[int] = None,

) -> AsyncGenerator[dict, None]:

    """Generate a single agent's response using streaming.



    Yields dicts of one of two shapes:

      {"kind": "token", "text": str}

      {"kind": "usage", "prompt": int, "completion": int, "total": int}

    """

    messages = [

        {"role": "system", "content": agent.system_prompt},

        {"role": "system", "content": f"""当前讨论主题：{topic}



你是 {agent.name}（{agent.role}）。

这是第 {round_num}/{total_rounds} 轮讨论。

{'这是最后一轮，请给出你的最终建议和总结。' if round_num == total_rounds else '请基于之前的讨论继续深入。'}



请用简洁有力的语言发表你的观点（200-400字），直接给出专业见解，不要客套。



【格式要求】

- 使用 ## 作为小节标题，禁止使用 # 一级标题

- 技术名词（如组件名、指标名、命令等）使用行内代码 `code` 格式，不要用代码块

- 仅在需要展示多行代码/配置/YAML时使用代码块（```lang ... ```）

- 使用 - 或数字列表枚举要点，保持层级清晰

- 不要在列表项中嵌套代码块"""},

    ]



    stance_extra = stance_instruction(getattr(agent, "stance", None))

    if stance_extra:

        messages.append({"role": "system", "content": stance_extra})



    # Token-budget-aware truncation (replaces the old simple [-10:] slice):

    # walk newest-first and keep messages until we hit the char budget so

    # very long discussions don't blow past the context window.

    for msg in truncate_history_by_chars(discussion_history, max_chars=8000):

        messages.append({

            "role": "user",

            "content": f"[{msg['agent_name']}]: {msg['content']}"

        })



    if not discussion_history:

        messages.append({

            "role": "user",

            "content": f"请针对以下想法发表你的专业观点：\n\n{topic}"

        })

    else:

        messages.append({

            "role": "user",

            "content": "请基于以上讨论，发表你的观点。"

        })



    try:

        stream = await client.chat.completions.create(

            model=model,

            messages=messages,

            stream=True,

            stream_options={"include_usage": True},

            temperature=0.8,

            max_tokens=max_tokens or (1200 if round_num == total_rounds else 800),

        )



        async for chunk in stream:

            # Final usage chunk has empty choices but a populated usage field

            if getattr(chunk, "usage", None):

                u = chunk.usage

                yield {

                    "kind": "usage",

                    "prompt": getattr(u, "prompt_tokens", 0) or 0,

                    "completion": getattr(u, "completion_tokens", 0) or 0,

                    "total": getattr(u, "total_tokens", 0) or 0,

                }

                continue

            if chunk.choices and chunk.choices[0].delta.content:

                yield {"kind": "token", "text": chunk.choices[0].delta.content}

    except Exception as e:

        yield {"kind": "token", "text": f"[Error: {str(e)}]"}





async def discussion_stream(config: DiscussionConfig) -> AsyncGenerator[str, None]:

    """Stream the entire multi-agent discussion."""

    # Initialize with existing history if continuing

    discussion_history = list(config.existing_history) if config.existing_history else []



    # Add user feedback to context if present

    if config.user_feedback:

        for fb in config.user_feedback:

            discussion_history.append({

                "agent_id": "__user__",

                "agent_name": "用户反馈",

                "round": 0,

                "content": fb,

            })



    # If rounds is 0, just generate summary

    if config.rounds == 0:

        yield json.dumps({"type": "summary_start"})

        summary_client = default_client

        summary_model = DEFAULT_MODEL

        summary_pid = config.summary_provider_id or config.default_provider_id

        if summary_pid and config.providers and summary_pid in config.providers:

            p = config.providers[summary_pid]

            summary_client = AsyncOpenAI(api_key=p.apiKey, base_url=p.baseUrl)

            summary_model = p.model

        # Filter out user feedback for summary generation

        agent_history = [h for h in discussion_history if h.get("agent_id") != "__user__"]

        summary, summary_usage = await generate_final_summary(

            summary_client, summary_model, config.topic, config.agents, agent_history, config.language

        )

        summary_done_event: dict = {"type": "summary_done", "content": summary}

        if summary_usage is not None:

            summary_done_event["usage"] = summary_usage

        yield json.dumps(summary_done_event)

        yield json.dumps({"type": "discussion_end", "history": agent_history})

        return



    start_round = config.start_round or 1



    yield json.dumps({

        "type": "discussion_start",

        "topic": config.topic,

        "agents": [a.model_dump() for a in config.agents],

        "rounds": config.rounds,

    })



    for round_num in range(start_round, start_round + config.rounds):

        yield json.dumps({

            "type": "round_start",

            "round": round_num,

            "total_rounds": config.rounds,

        })



        for agent in config.agents:

            # Resolve provider for this specific agent

            client, model, provider_max_tokens = get_client_for_agent(

                agent, config.providers, config.default_provider_id

            )



            yield json.dumps({

                "type": "agent_start",

                "agent_id": agent.id,

                "agent_name": agent.name,

                "round": round_num,

            })



            full_response = ""

            agent_usage: Optional[dict] = None

            async for chunk in generate_agent_response(

                client, model, agent, config.topic, discussion_history, round_num, config.rounds,

                max_tokens=provider_max_tokens,

            ):

                if chunk["kind"] == "token":

                    full_response += chunk["text"]

                    yield json.dumps({

                        "type": "agent_token",

                        "agent_id": agent.id,

                        "token": chunk["text"],

                    })

                elif chunk["kind"] == "usage":

                    agent_usage = {

                        "prompt": chunk["prompt"],

                        "completion": chunk["completion"],

                        "total": chunk["total"],

                    }



            discussion_history.append({

                "agent_id": agent.id,

                "agent_name": agent.name,

                "round": round_num,

                "content": full_response,

            })



            agent_done_event = {

                "type": "agent_done",

                "agent_id": agent.id,

                "agent_name": agent.name,

                "content": full_response,

                "round": round_num,

            }

            if agent_usage is not None:

                agent_done_event["usage"] = agent_usage

            yield json.dumps(agent_done_event)



            await asyncio.sleep(0.5)



        yield json.dumps({

            "type": "round_end",

            "round": round_num,

        })



    # Generate final summary using summary provider (or default)

    yield json.dumps({"type": "summary_start"})



    # Use summary provider if specified, otherwise default

    summary_client = default_client

    summary_model = DEFAULT_MODEL

    summary_pid = config.summary_provider_id or config.default_provider_id

    if summary_pid and config.providers and summary_pid in config.providers:

        p = config.providers[summary_pid]

        summary_client = AsyncOpenAI(api_key=p.apiKey, base_url=p.baseUrl)

        summary_model = p.model



    # Filter out user feedback for summary generation

    agent_history = [h for h in discussion_history if h.get("agent_id") != "__user__"]

    summary, summary_usage = await generate_final_summary(

        summary_client, summary_model, config.topic, config.agents, agent_history, config.language

    )

    summary_done_event: dict = {

        "type": "summary_done",

        "content": summary,

    }

    if summary_usage is not None:

        summary_done_event["usage"] = summary_usage

    yield json.dumps(summary_done_event)



    yield json.dumps({

        "type": "discussion_end",

        "history": agent_history,

    })





async def generate_final_summary(

    client: AsyncOpenAI,

    model: str,

    topic: str,

    agents: list[Agent],

    discussion_history: list[dict],

    language: str = "zh",

) -> tuple[str, Optional[dict]]:

    """Generate the final architecture design document.



    Returns (summary_text, usage_dict_or_none).

    """

    history_text = "\n\n".join([

        f"【{msg['agent_name']}·第{msg['round']}轮】:\n{msg['content']}"

        for msg in discussion_history

    ])



    lang_label = "中文" if language == "zh" else "English"

    messages = [

        {"role": "system", "content": f"""你是一位技术文档专家，擅长将讨论内容整理为结构化的架构设计文档。

请基于多位专家的讨论，用{lang_label}输出一份完整的架构设计方案。



【严格格式规范——必须遵守】

1. 使用 # 作为文档大标题（仅一次），## 作为章节标题，### 作为子节标题。禁止跳级。

2. 技术名词、组件名、指标名、命令等使用行内代码 `code`，不要为单个名词使用代码块。

3. 仅在展示多行代码、配置文件、SQL、YAML 等内容时使用代码块，并标注语言：

   ```yaml

   key: value

   ```

4. 使用 - 无序列表或 1. 有序列表来枚举要点，保持缩进一致。

5. 表格使用标准 Markdown 表格语法（| 列 | 列 |）。

6. 不要在一个代码块里只放一个单词或短语。

7. 每个章节之间用空行分隔，确保 Markdown 渲染正常。"""},

        {"role": "user", "content": f"""项目主题：{topic}



以下是各位专家的讨论记录：



{history_text}



请整理输出一份完整的架构设计文档，包含以下章节（使用 ## 标记）：

## 1. 项目概述

## 2. 架构总览

## 3. 核心模块设计

## 4. 技术选型及理由

## 5. 安全设计

## 6. 性能优化策略

## 7. 部署方案

## 8. 开发路线图（MVP → 完整版）



如果讨论中提到了架构关系，请用 Mermaid 图表表示（```mermaid）。"""},

    ]



    response = await client.chat.completions.create(

        model=model,

        messages=messages,

        temperature=0.3,

        max_tokens=4000,

    )



    usage_dict: Optional[dict] = None

    if getattr(response, "usage", None):

        u = response.usage

        usage_dict = {

            "prompt": getattr(u, "prompt_tokens", 0) or 0,

            "completion": getattr(u, "completion_tokens", 0) or 0,

            "total": getattr(u, "total_tokens", 0) or 0,

        }



    content = ""

    if response.choices and response.choices[0].message.content:

        content = response.choices[0].message.content

    return content, usage_dict





# ============ API Routes ============



@app.post("/api/discuss")

async def start_discussion(config: DiscussionConfig):

    """Start a multi-agent discussion with SSE streaming."""

    if not config.agents:

        raise HTTPException(status_code=400, detail="At least one agent is required")

    if not config.topic.strip():

        raise HTTPException(status_code=400, detail="Topic cannot be empty")



    async def event_generator():

        async for data in discussion_stream(config):

            yield {"event": "message", "data": data}



    return EventSourceResponse(event_generator())





@app.post("/api/fetch-models")

async def fetch_models(request: FetchModelsRequest):

    """Fetch available models from a provider's /models endpoint."""

    try:

        import httpx



        headers = {}

        if request.apiKey:

            headers["Authorization"] = f"Bearer {request.apiKey}"



        async with httpx.AsyncClient(timeout=15.0) as http_client:

            # Try the standard OpenAI /models endpoint

            base = request.baseUrl.rstrip('/')

            url = f"{base}/models"



            resp = await http_client.get(url, headers=headers)



            if resp.status_code == 200:

                data = resp.json()

                models = []



                # Handle OpenAI-style response

                if "data" in data:

                    for item in data["data"]:

                        model_id = item.get("id", "")

                        if model_id:

                            models.append(model_id)

                # Handle array response

                elif isinstance(data, list):

                    for item in data:

                        if isinstance(item, str):

                            models.append(item)

                        elif isinstance(item, dict):

                            models.append(item.get("id", item.get("name", "")))



                # Sort models alphabetically

                models = sorted([m for m in models if m])

                return {"models": models}

            else:

                raise HTTPException(

                    status_code=resp.status_code,

                    detail=f"Provider returned {resp.status_code}: {resp.text[:200]}"

                )



    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"获取模型列表失败: {str(e)}")





@app.post("/api/test-connection")

async def test_connection(request: TestConnectionRequest):

    """Test API connection with provided settings."""

    try:

        test_client = AsyncOpenAI(

            api_key=request.apiKey,

            base_url=request.baseUrl,

        )

        response = await test_client.chat.completions.create(

            model=request.model,

            messages=[{"role": "user", "content": "Hi"}],

            max_tokens=5,

        )

        if response.choices:

            return {"status": "ok", "message": "连接成功"}

        raise HTTPException(status_code=500, detail="API返回异常")

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(status_code=400, detail=f"连接失败: {str(e)}")





@app.get("/health")

async def health_check():

    return {"status": "ok"}





# ============ Flow Endpoints ============



from flow_engine import (

    FlowStepConfig, flow_step_stream,

    StepContextRequest, generate_step_context,

    FlowSummaryRequest, generate_flow_summary,

)





@app.post("/api/flow/step")

async def flow_step(config: FlowStepConfig):

    """Execute a single flow step with context injection. Streams SSE.



    Using the pydantic model directly as the parameter type makes FastAPI

    perform validation up front and return a 422 (Unprocessable Entity) for

    out-of-range fields like rounds, instead of bubbling a ValidationError

    out as a 500 from inside the SSE generator.

    """

    async def event_generator():

        async for data in flow_step_stream(config):

            yield {"event": "message", "data": data}



    return EventSourceResponse(event_generator())





@app.post("/api/flow/step-context")

async def flow_step_context(request: StepContextRequest):

    """Generate a structured summary of a completed step."""

    summary = await generate_step_context(request)

    return {"summary": summary}





@app.post("/api/flow/summarize")

async def flow_summarize(request: FlowSummaryRequest):

    """Generate the final flow-level synthesis document."""

    summary = await generate_flow_summary(request)

    return {"summary": summary}





if __name__ == "__main__":

    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)


"""

Flow Engine - Handles multi-step discussion flow execution.

Each step delegates to the existing discussion mechanism.

"""

import json

from typing import AsyncGenerator, Optional



from pydantic import BaseModel, Field

from openai import AsyncOpenAI



from shared import (

    Agent, ProviderSettings, default_client, DEFAULT_MODEL,

    get_client_for_agent, get_client, stance_instruction,

    truncate_history_by_chars,

)





class StepContextData(BaseModel):

    step_id: str

    topic: str

    rounds: int

    agents: list[str]

    summary: str





class FlowStepConfig(BaseModel):

    topic: str

    agents: list[Agent]

    # Per-step rounds: must be at least 1; capped to bound LLM call volume

    rounds: int = Field(default=2, ge=1, le=20)

    language: str = "zh"

    step_id: str

    step_index: int

    total_steps: int = 1

    accumulated_context: list[StepContextData] = []

    default_provider_id: Optional[str] = None

    # Per-step provider override; sits between agent.providerId and default

    step_provider_id: Optional[str] = None

    providers: Optional[dict[str, ProviderSettings]] = None

    max_context_tokens: int = 2000

    user_feedback: Optional[list[str]] = None





class StepContextRequest(BaseModel):

    step_id: str

    step_topic: str

    messages: list[dict]

    agents: list[Agent]

    language: str = "zh"

    provider_id: Optional[str] = None

    providers: Optional[dict[str, ProviderSettings]] = None





class FlowSummaryRequest(BaseModel):

    flow_name: str

    topic: str = ""

    completed_steps: list[StepContextData]

    agents: list[Agent]

    language: str = "zh"

    provider_id: Optional[str] = None

    providers: Optional[dict[str, ProviderSettings]] = None





def _get_client(provider_id: Optional[str], providers: Optional[dict[str, ProviderSettings]]) -> tuple[AsyncOpenAI, str]:

    return get_client(provider_id, providers)





def _build_context_prompt(config: FlowStepConfig) -> str:

    """Build the context injection string from accumulated step contexts."""

    if not config.accumulated_context:

        return ""



    parts = []

    for ctx in config.accumulated_context:

        parts.append(f"[\u6b65\u9aa4: {ctx.topic}]\n{ctx.summary}")



    context_str = "\n\n".join(parts)



    # Truncate if too long (rough char-based budget)

    max_chars = config.max_context_tokens * 4  # ~4 chars per token

    if len(context_str) > max_chars:

        context_str = "...\n" + context_str[-(max_chars - 4):]



    # Add user feedback if present

    if config.user_feedback:

        feedback_str = "\n".join([f"[\u7528\u6237\u53cd\u9988]: {fb}" for fb in config.user_feedback])

        context_str += "\n\n" + feedback_str



    return context_str





async def flow_step_stream(config: FlowStepConfig) -> AsyncGenerator[str, None]:

    """Execute a single flow step as a discussion, with context injection."""

    import asyncio



    context_prompt = _build_context_prompt(config)

    discussion_history = []



    # Emit step start

    yield json.dumps({

        "type": "step_start",

        "step_id": config.step_id,

        "step_index": config.step_index,

        "topic": config.topic,

    })



    for round_num in range(1, config.rounds + 1):

        yield json.dumps({

            "type": "round_start",

            "round": round_num,

            "total_rounds": config.rounds,

        })



        for agent in config.agents:

            # Provider resolution priority:

            #   agent.providerId > step_provider_id > default_provider_id

            effective_default = config.step_provider_id or config.default_provider_id

            client, model, provider_max_tokens = get_client_for_agent(

                agent, config.providers, effective_default

            )



            yield json.dumps({

                "type": "agent_start",

                "agent_id": agent.id,

                "agent_name": agent.name,

                "round": round_num,

            })



            # Build messages with context injection

            messages = [

                {"role": "system", "content": agent.system_prompt},

            ]



            # Inject accumulated context from prior steps

            if context_prompt:

                messages.append({

                    "role": "system",

                    "content": f"以下是之前讨论步骤的结论，请基于这些背景继续讨论：\n\n{context_prompt}"

                })



            messages.append({

                "role": "system",

                "content": (

                    f"当前讨论主题：{config.topic}\n\n"

                    f"你是 {agent.name}（{agent.role}）。\n"

                    f"这是第 {round_num}/{config.rounds} 轮讨论（流程步骤 {config.step_index + 1}/{config.total_steps}）。\n"

                    f"{'这是最后一轮，请给出你的最终建议和总结。' if round_num == config.rounds else '请基于之前的讨论继续深入。'}\n\n"

                    "请用简洁有力的语言发表你的观点（200-400字），直接给出专业见解。\n\n"

                    "【格式要求】\n"

                    "- 使用 ## 作为小节标题，禁止使用 # 一级标题\n"

                    "- 技术名词（如组件名、指标名、命令等）使用行内代码 `code` 格式，不要用代码块\n"

                    "- 仅在需要展示多行代码/配置/YAML时使用代码块（```lang ... ```）\n"

                    "- 使用 - 或数字列表枚举要点，保持层级清晰\n"

                    "- 不要在列表项中嵌套代码块"

                )

            })



            stance_extra = stance_instruction(getattr(agent, "stance", None))

            if stance_extra:

                messages.append({"role": "system", "content": stance_extra})



            for msg in truncate_history_by_chars(discussion_history, max_chars=8000):

                messages.append({

                    "role": "user",

                    "content": f"[{msg['agent_name']}]: {msg['content']}"

                })



            if not discussion_history:

                messages.append({

                    "role": "user",

                    "content": f"请针对以下主题发表你的专业观点：\n\n{config.topic}"

                })

            else:

                messages.append({

                    "role": "user",

                    "content": "请基于以上讨论，发表你的观点。"

                })



            full_response = ""

            agent_usage: Optional[dict] = None

            try:

                stream = await client.chat.completions.create(

                    model=model, messages=messages,

                    stream=True,

                    stream_options={"include_usage": True},

                    temperature=0.8, max_tokens=provider_max_tokens or (1200 if round_num == config.rounds else 800),

                )

                async for chunk in stream:

                    # Final usage chunk has no choices but has usage

                    if getattr(chunk, "usage", None):

                        u = chunk.usage

                        agent_usage = {

                            "prompt": getattr(u, "prompt_tokens", 0) or 0,

                            "completion": getattr(u, "completion_tokens", 0) or 0,

                            "total": getattr(u, "total_tokens", 0) or 0,

                        }

                        continue

                    if chunk.choices and chunk.choices[0].delta.content:

                        token = chunk.choices[0].delta.content

                        full_response += token

                        yield json.dumps({

                            "type": "agent_token",

                            "agent_id": agent.id,

                            "token": token,

                        })

            except Exception as e:

                full_response = f"[Error: {str(e)}]"



            discussion_history.append({

                "agent_id": agent.id,

                "agent_name": agent.name,

                "round": round_num,

                "content": full_response,

            })



            agent_done_event: dict = {

                "type": "agent_done",

                "agent_id": agent.id,

                "agent_name": agent.name,

                "content": full_response,

                "round": round_num,

            }

            if agent_usage is not None:

                agent_done_event["usage"] = agent_usage

            yield json.dumps(agent_done_event)



            await asyncio.sleep(0.3)



        yield json.dumps({"type": "round_end", "round": round_num})



    # Emit step done

    yield json.dumps({

        "type": "step_done",

        "step_id": config.step_id,

        "step_index": config.step_index,

    })





async def generate_step_context(request: StepContextRequest) -> str:

    """Generate a structured summary of a completed step's discussion."""

    client, model = _get_client(request.provider_id, request.providers)



    history_text = "\n\n".join([

        f"[{msg.get('agent_name', 'Agent')}]: {msg.get('content', '')}"

        for msg in request.messages[-20:]  # Last 20 messages

    ])



    messages = [

        {"role": "system", "content": "\u4f60\u662f\u4e00\u4f4d\u6280\u672f\u6587\u6863\u4e13\u5bb6\u3002\u8bf7\u5c06\u4ee5\u4e0b\u8ba8\u8bba\u5185\u5bb9\u63d0\u70bc\u4e3a\u7b80\u6d01\u7684\u7ed3\u8bba\u6458\u8981\uff08200-300\u5b57\uff09\uff0c\u5305\u542b\u5173\u952e\u51b3\u7b56\u3001\u5171\u8bc6\u548c\u5f85\u89e3\u51b3\u95ee\u9898\u3002"},

        {"role": "user", "content": f"\u8ba8\u8bba\u4e3b\u9898\uff1a{request.step_topic}\n\n\u8ba8\u8bba\u8bb0\u5f55\uff1a\n{history_text}\n\n\u8bf7\u63d0\u70bc\u5173\u952e\u7ed3\u8bba\u3002"},

    ]



    response = await client.chat.completions.create(

        model=model, messages=messages,

        temperature=0.3, max_tokens=500,

    )



    if response.choices and response.choices[0].message.content:

        return response.choices[0].message.content

    return ""





async def generate_flow_summary(request: FlowSummaryRequest) -> str:

    """Generate the final flow-level synthesis document."""

    client, model = _get_client(request.provider_id, request.providers)



    steps_text = "\n\n".join([

        f"## \u6b65\u9aa4: {step.topic}\n{step.summary}"

        for step in request.completed_steps

    ])



    messages = [

        {"role": "system", "content": "\u4f60\u662f\u4e00\u4f4d\u6280\u672f\u6587\u6863\u4e13\u5bb6\uff0c\u64c5\u957f\u5c06\u591a\u6b65\u9aa4\u8ba8\u8bba\u5185\u5bb9\u6574\u7406\u4e3a\u7ed3\u6784\u5316\u7684\u67b6\u6784\u8bbe\u8ba1\u6587\u6863\u3002"},

        {"role": "user", "content": f"""\u9879\u76ee\u4e3b\u9898\uff1a{request.topic or request.flow_name}



\u4ee5\u4e0b\u662f\u5404\u6b65\u9aa4\u7684\u8ba8\u8bba\u7ed3\u8bba\uff1a



{steps_text}



\u8bf7\u6574\u7406\u8f93\u51fa\u4e00\u4efd\u5b8c\u6574\u7684\u67b6\u6784\u8bbe\u8ba1\u6587\u6863\uff0c\u5305\u542b\uff1a

1. \u9879\u76ee\u6982\u8ff0

2. \u67b6\u6784\u603b\u89c8

3. \u6838\u5fc3\u6a21\u5757\u8bbe\u8ba1

4. \u6280\u672f\u9009\u578b\u53ca\u7406\u7531

5. \u5b89\u5168\u8bbe\u8ba1

6. \u6027\u80fd\u4f18\u5316\u7b56\u7565

7. \u90e8\u7f72\u65b9\u6848

8. \u5f00\u53d1\u8def\u7ebf\u56fe



\u8bf7\u7528Markdown\u683c\u5f0f\u8f93\u51fa\uff0c\u8bed\u8a00\uff1a{"\u4e2d\u6587" if request.language == "zh" else "English"}"""},

    ]



    response = await client.chat.completions.create(

        model=model, messages=messages,

        temperature=0.3, max_tokens=4000,

    )



    if response.choices and response.choices[0].message.content:

        return response.choices[0].message.content

    return ""


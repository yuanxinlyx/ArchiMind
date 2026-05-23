"""Shared models and utilities used by both main.py and flow_engine.py"""

import os

from typing import Optional

from pydantic import BaseModel

from openai import AsyncOpenAI

from dotenv import load_dotenv



load_dotenv()



# Default client from env (fallback)

default_client = AsyncOpenAI(

    api_key=os.getenv("OPENAI_API_KEY", "sk-placeholder"),

    base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),

)

DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4")





class ProviderSettings(BaseModel):

    apiKey: str

    baseUrl: str

    model: str

    maxTokens: Optional[int] = None





class Agent(BaseModel):

    id: str

    name: str

    role: str

    avatar: str

    system_prompt: str

    color: str

    providerId: Optional[str] = None

    # 'neutral' (default), 'support', or 'challenge'.

    # Drives prompt-engineered stance instructions.

    stance: Optional[str] = None





def get_client_for_agent(

    agent: Agent,

    providers: Optional[dict[str, ProviderSettings]],

    default_provider_id: Optional[str],

) -> tuple[AsyncOpenAI, str, Optional[int]]:

    """Resolve which client, model, and maxTokens to use for a given agent."""

    provider_id = agent.providerId or default_provider_id

    if provider_id and providers and provider_id in providers:

        p = providers[provider_id]

        client = AsyncOpenAI(api_key=p.apiKey, base_url=p.baseUrl)

        return client, p.model, p.maxTokens

    return default_client, DEFAULT_MODEL, None





def get_client(

    provider_id: Optional[str],

    providers: Optional[dict[str, ProviderSettings]],

) -> tuple[AsyncOpenAI, str]:

    """Get client by provider ID."""

    if provider_id and providers and provider_id in providers:

        p = providers[provider_id]

        return AsyncOpenAI(api_key=p.apiKey, base_url=p.baseUrl), p.model

    return default_client, DEFAULT_MODEL





def truncate_history_by_chars(

    discussion_history: list[dict],

    max_chars: int = 8000,

) -> list[dict]:

    """Keep the most-recent messages whose total content fits in the budget.



    Walks from newest to oldest, accumulating character count, and stops

    once the next message would push past `max_chars`. Always keeps at least

    one message if the list is non-empty.

    """

    if not discussion_history:

        return []

    kept: list[dict] = []

    total = 0

    for msg in reversed(discussion_history):

        size = len(msg.get("content", "")) + len(msg.get("agent_name", "")) + 8

        if kept and total + size > max_chars:

            break

        kept.append(msg)

        total += size

    kept.reverse()

    return kept





def stance_instruction(stance: Optional[str]) -> str:

    """Return an extra system-level instruction tailored to the agent's

    discussion stance.  Returns '' for neutral / unrecognized stances.

    """

    if stance == "challenge":

        return (

            "\u4f5c\u4e3a\u201c\u9b54\u9b3c\u4ee3\u8a00\u4eba\u201d\uff0c"

            "\u4f60\u7684\u804c\u8d23\u662f\u4e3b\u52a8\u8d28\u7591\u4e0a\u4e00\u4f4d\u53d1\u8a00\u8005\u7684\u6838\u5fc3\u5047\u8bbe\uff0c"

            "\u6307\u51fa\u81f3\u5c11\u4e00\u4e2a\u88ab\u5ffd\u7565\u7684\u98ce\u9669\u3001\u8fb9\u754c\u6761\u4ef6\u6216\u53cd\u4f8b\u3002"

            "\u907f\u514d\u5ba2\u5957\u3001\u907f\u514d\u9644\u8bae\u3002"

        )

    if stance == "support":

        return (

            "\u4f60\u503e\u5411\u4e8e\u5728\u73b0\u6709\u601d\u8def\u4e0a\u8865\u5145\u3001\u5b8c\u5584\u548c\u52a0\u5f3a\uff0c"

            "\u8bf4\u660e\u4f55\u4ee5\u73b0\u6709\u65b9\u6848\u80fd\u8d70\u5f97\u66f4\u8fdc\u3002"

        )

    return ""


from openai import OpenAI
from pydantic import BaseModel

client = OpenAI()  # reads OPENAI_API_KEY from the environment

class CalendarEvent(BaseModel):
    title: str
    date: str
    participants: list[str]

response = client.responses.parse(
    model="gpt-6.2-astra",
    input=[
        {"role": "user", "content": "Lunch with Ana and Ben next Tuesday."},
    ],
    text_format=CalendarEvent,
)

event = response.output_parsed  # a validated CalendarEvent instance

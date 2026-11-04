import smtplib
import ssl
from email.message import EmailMessage

from starlette.concurrency import run_in_threadpool

from app.core.config import settings


def send(recipient: str, code: str, ticket_id: str, token: str):
    message = EmailMessage()
    message["From"] = settings.MAIL_FROM
    message["To"] = recipient
    message["Subject"] = f"Tiketa {code}: resolution confirmation"
    message.set_content(
        f"Your ticket {code} is resolved.\n"
        f"Confirm with POST {settings.PUBLIC_BASE_URL}/api/v1/tickets/{ticket_id}/confirm-closure\n"
        f'JSON body: {{"token": "{token}"}}\n'
        "Only confirm after verifying that the issue is fixed. This token is single-use."
    )
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
        if settings.SMTP_STARTTLS:
            smtp.starttls(context=ssl.create_default_context())
        if settings.SMTP_USERNAME:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)


async def send_closure(recipient: str, code: str, ticket_id: str, token: str):
    await run_in_threadpool(send, recipient, code, ticket_id, token)

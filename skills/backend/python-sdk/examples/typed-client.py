from __future__ import annotations

import httpx


class OrdersError(Exception):
    def __init__(self, message: str, *, status_code: int, code: str,
                 request_id: str | None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.request_id = request_id


class OrdersClient:
    def __init__(self, api_key: str, *, base_url: str = "https://api.example.com",
                 timeout: float = 30.0) -> None:
        self._client = httpx.Client(
            base_url=base_url,
            timeout=httpx.Timeout(timeout),
            headers={
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "orders-sdk/1.0.0",
            },
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> OrdersClient:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def get_order(self, order_id: str) -> dict[str, object]:
        response = self._client.get(f"/v1/orders/{order_id}")
        if response.status_code >= 400:
            raise OrdersError(
                f"Request failed with status {response.status_code}",
                status_code=response.status_code,
                code="request_failed",
                request_id=response.headers.get("x-request-id"),
            )
        return response.json()

    def list_orders(self, *, limit: int = 50):
        """Yield orders lazily, one page at a time."""
        cursor: str | None = None
        while True:
            params: dict[str, object] = {"limit": limit}
            if cursor is not None:
                params["cursor"] = cursor
            response = self._client.get("/v1/orders", params=params)
            if response.status_code >= 400:
                raise OrdersError(
                    f"Request failed with status {response.status_code}",
                    status_code=response.status_code,
                    code="request_failed",
                    request_id=response.headers.get("x-request-id"),
                )
            page = response.json()
            yield from page["data"]
            cursor = page.get("next_cursor")
            if cursor is None:
                return

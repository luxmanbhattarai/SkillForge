# Caddy reverse proxy

A minimal Caddyfile: automatic HTTPS and a reverse proxy to the app:

```caddyfile
example.com {
    reverse_proxy localhost:3000
}
```

Apply it without dropping connections:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

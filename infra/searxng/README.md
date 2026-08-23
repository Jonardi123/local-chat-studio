# sudoN SearXNG service

Start: `SEARXNG_SECRET="$(openssl rand -hex 32)" docker compose -f infra/searxng/compose.yml up -d`

Status: `sudo docker compose -f infra/searxng/compose.yml ps`

Stop: `sudo docker compose -f infra/searxng/compose.yml down`

This binds SearXNG to port 8888 so sudoN clients on the private LAN can search without an API key. Port 8080 remains reserved for llama.cpp.

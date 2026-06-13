.PHONY: dev docker seed

# Local dev (no Docker)
dev:
	npx concurrently \
	  "cd apps/signal && pnpm dev" \
	  "cd apps/ai-backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000" \
	  "cd apps/web && pnpm dev"

# Full Docker stack
docker:
	docker compose -f infra/docker/docker_compose.yml up --build

docker-down:
	docker compose -f infra/docker/docker_compose.yml down

# Seed database
seed:
	npx prisma db seed

# Run migrations
migrate:
	npx prisma migrate dev

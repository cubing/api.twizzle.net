.PHONY: dev
dev:
	deno run --allow-net --allow-env ./src/dev/test.ts

.PHONY: dev-client
dev-client:
	npx parcel src/dev/browser/index.html

.PHONY: dev
dev:
	deno run \
		--allow-write \
		--allow-read \
		--unstable \
		--location http://localhost \
		--allow-net \
		--allow-env ./src/dev/test.ts

.PHONY: dev-client
dev-client:
	npx parcel src/dev/browser/index.html

DENO_FLAGS = --allow-write --allow-read --unstable --location http://localhost --allow-net --allow-env

.PHONY: dev
dev:
	deno run $(DENO_FLAGS) ./src/dev/test.ts

.PHONY: prod
prod:
	deno run $(DENO_FLAGS) ./src/prod/serve.ts

.PHONY: dev-client
dev-client:
	npx parcel src/dev/browser/index.html

.PHONY: deploy
deploy:
	# This uploads everything every time.
	# TODO: Figure out how to use SFTP/rsync
	gcloud compute ssh \
		api-twizzle-net \
		--project cubing --zone us-west2-b \
		-- \
		"mkdir -p ~/api.twizzle.net"
	gcloud compute scp \
		--project cubing --zone us-west2-b \
		--recurse \
		./Caddyfile \
		./Makefile \
		./src \
		api-twizzle-net:~/api.twizzle.net/

DENO_FLAGS = --allow-write --allow-read --unstable --location http://localhost --allow-net --allow-env

.PHONY: dev
dev:
	deno run $(DENO_FLAGS) ./src/dev/serve.ts

.PHONY: prod
prod:
	deno run $(DENO_FLAGS) ./src/prod/serve.ts

CLIENT_ENTRY_FILE=src/twizzle.net/stream/index.html
.PHONY: dev-client
dev-client:
	npx parcel $(CLIENT_ENTRY_FILE)

.PHONY: deploy
deploy: deploy-server deploy-client

.PHONY: deploy-server
deploy-server:
	# This uploads everything every time.
	# TODO: Figure out how to use SFTP/rsync
	gcloud compute scp \
		--project cubing --zone us-west2-b \
		--recurse \
		./Caddyfile \
		./Makefile \
		./src \
		api-twizzle-net:~/api.twizzle.net/
	make restart-prod-api-server

.PHONY: backup-server
backup-server:
	gcloud compute scp \
		--project cubing --zone us-west2-b \
		--recurse \
		api-twizzle-net:~/api.twizzle.net/ \
		~/.data/api.twizzle.net/backups/

.PHONY: restart-prod-api-server
restart-prod-api-server:
	gcloud compute ssh api-twizzle-net --project cubing --zone us-west2-b -- "sudo systemctl daemon-reload; sudo systemctl restart twizzle-api-server"
	@sleep 1
	@echo "\n\n\n\n"
	curl -i https://api.twizzle.net/v0/infra/liveness_check
	@echo "\n\n\n\n"
	
CLIENT_SFTP_PATH = "towns.dreamhost.com:~/twizzle.net/stream/"
CLIENT_URL       = "https://twizzle.net/stream/"

.PHONY: deploy-client
deploy-client: build-prod-client
	rsync -avz \
		--exclude .DS_Store \
		--exclude .git \
		./dist/ \
		${CLIENT_SFTP_PATH}
	echo "\nDone deploying. Go to ${CLIENT_URL}\n"

.PHONY: build-prod-client
build-prod-client: clean
	env NODE_ENV=production \
		npx parcel build \
			--no-scope-hoist \
			--public-url ./ \
			$(CLIENT_ENTRY_FILE)

.PHONY: clean
clean:
	rm -rf .parcel-cache dist

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
deploy: deploy-server deploy-client

.PHONY: deploy-server
deploy-server:
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
	make restart-prod-api-server

.PHONY: restart-prod-api-server
restart-prod-api-server:
	gcloud compute ssh api-twizzle-net --project cubing --zone us-west2-b -- "fish -c \"cd ~/api.twizzle.net/ ; set -x TWIZZLE_WCA_APPLICATION_CLIENT_SECRET (cat ~/secrets/TWIZZLE_WCA_APPLICATION_CLIENT_SECRET.txt) ; pkill make ; nohup make prod &; disown\""
	
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
			src/dev/browser/index.html

.PHONY: clean
clean:
	rm -rf .parcel-cache dist

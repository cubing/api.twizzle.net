# `api.twizzle.net`

The API server for <https://twizzle.net/stream/> .

If you're trying to figure out how it works,
[`TwizzleAPIServer.ts`](./src/api.twizzle.net/server/TwizzleAPIServer.ts) is the
core of the server implementation.

## API

### `GET /v0/streams`

Get a list of active streams.

```typescript
{
  "streams": [
    {
      "streamID": string,
      "senders": {
        "twizzleUserID": string,
        "wcaID": string | null,
        "name": string,
      },
    },
  ];
}
```

### `POST /v0/streams?twizzleAccessToken={twizzleAccessToken}`

Create a new stream.

```typescript
{
  "streamID": string,
  "senders": {
    "twizzleUserID": string,
    "wcaID": string | null,
    "name": string,
  },
}
```

### `GET /v0/streams/{STREAM_ID}/socket?[twizzleAccessToken={twizzleAccessToken}]`

Connect to a stream. The access token is optional (required for sending).

Upgrades to a web socket. The protocol is still in flux; see
[`src/api.twizzle.net/common/stream.ts`](src/api.twizzle.net/common/stream.ts)
for message types.

### `GET /v0/auth/wca/oauth_callback?code={code}`

[WCA
OAuth](https://github.com/thewca/worldcubeassociation.org/wiki/OAuth-documentation-notes)
callback. API clients will not call this directly; the
WCA website will send the user here.

```
Status: 302 (non-permanent redirect)
Location: https://twizzle.net/stream/?claimToken={claimToken}
```

### `POST /v0/claim?claimToken={claimToken}`

Claim the token from an OAuth redirect.

```typescript
{
  "twizzleAccessToken": string;
  "userInfo": {
    "twizzleUserID": string;
    "wcaID": WCA_ID | null;
    "name": string;
  }
}
```

### `GET /v0/infra/liveness_check`

```typescript
{
  "startTimestamp": number, // unix time in milliseconds
  "startTimestampHuman": string, // Javascript date string
  "uptimeSeconds": number
}
```

## Server setup

### Caddy

```shell
sudo apt install fish unzip make
fish
sudo chsh -s (which fish) (whoami)

# https://deno.land/manual/getting_started/installation
curl -fsSL https://deno.land/x/install/install.sh | sh
sudo mv /home/lgarron/.deno/bin/deno /usr/local/bin/

# https://caddyserver.com/docs/install#debian-ubuntu-raspbian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.155B6D79CA56EA34.key' | sudo apt-key add -
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/config.deb.txt?distro=debian&version=any-version' | sudo tee -a /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

sudo caddy start
```

## Twizzle API server setup

```
fish

mkdir -p ~/secrets
read -x TWIZZLE_WCA_APPLICATION_CLIENT_SECRET
echo $TWIZZLE_WCA_APPLICATION_CLIENT_SECRET > ~/secrets/TWIZZLE_WCA_APPLICATION_CLIENT_SECRET.txt

mkdir -p ~/api.twizzle.net

sudo ln -s /home/lgarron/api.twizzle.net/src/prod/twizzle-api-server.service /etc/systemd/system/twizzle-api-server.service
```

Look in [`Makefile`](./Makefile) for commands to deploy/(re-)start the server.

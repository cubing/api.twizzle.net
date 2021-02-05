# `api.twizzle.net`

## Server config

```shell
sudo apt install fish unzip make
fish
sudo chsh -s (which fish) (whoami)

# https://deno.land/manual/getting_started/installation
curl -fsSL https://deno.land/x/install/install.sh | sh
sudo mv /home/lgarron/.deno/bin/deno /usr/local/bin/

sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.155B6D79CA56EA34.key' | sudo apt-key add -
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/config.deb.txt?distro=debian&version=any-version' | sudo tee -a /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

cd ~/api.twizzle.net/; sudo caddy start
```

## Running the server

Setup:

```
fish

mkdir -p ~/secrets
read -x TWIZZLE_WCA_APPLICATION_CLIENT_SECRET
echo $TWIZZLE_WCA_APPLICATION_CLIENT_SECRET > ~/secrets/TWIZZLE_WCA_APPLICATION_CLIENT_SECRET.txt

mkdir -p ~/api.twizzle.net

sudo ln -s /home/lgarron/api.twizzle.net/src/prod/twizzle-api-server.service /etc/systemd/system/twizzle-api-server.service
```

Look in [`Makefile`](./Makefile) for commands to deploy/(re-)start the server.

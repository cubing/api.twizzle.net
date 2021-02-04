# `api.twizzle.net`

## Server config

```shell
sudo apt install fish unzip make

# https://deno.land/manual/getting_started/installation
curl -fsSL https://deno.land/x/install/install.sh | sh
sudo mv /home/lgarron/.deno/bin/deno /usr/local/bin/

sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.155B6D79CA56EA34.key' | sudo apt-key add -
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/config.deb.txt?distro=debian&version=any-version' | sudo tee -a /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

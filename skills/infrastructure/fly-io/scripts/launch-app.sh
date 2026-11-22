curl -L -o install.sh https://fly.io/install.sh
# Review install.sh before running it, then:
sh install.sh
fly auth login
fly launch --db mpg
fly deploy

# Vinted Monitor

Welcome to the Vinted Real Monitor! This tool helps you keep track of new items on Vinted. It's like having your personal shopping assistant who never sleeps.

## Telegram Bot

We also have a pre-built Telegram bot that can manage your searches. It uses a database to remember your last search, so you don't have to start from scratch every time. It's like having a personal shopping assistant in your pocket.

![demo](demo.gif)

## How to Use It?

### Configuration

Before you can start using the Vinted Real Monitor, you need to configure the application. The configuration settings are stored in a file named `config.yaml`. You need to provide your Telegram bot token in this file. You can obtain a bot token from BotFather on Telegram.

```yaml
# Configuration settings for the Telegram bot

telegram:
  token: "YOUR_TELEGRAM_TOKEN" # Bot token obtained from BotFather

use_proxies: false # Set to true if you want to use a proxy server

# List of proxy configurations for handling multiple proxy servers
proxies:
  - host: "YOUR_PROXY_IP"  # Proxy server IP address
    port: "YOUR_PROXY_PORT"            # Proxy server port
    username: "YOUR_PROXY_USERNAME"       # Proxy authentication username
    password: "YOUR_PROXY_PASSWORD"  # Proxy authentication password
    type: "YOUR_PROXY_PROTOCOL"           # Proxy type, e.g., socks, http
```

> [!NOTE]\
> If you want to know about how to create a Telegram Bot : https://core.telegram.org/bots/tutorial
> Follow this tutorial to create your own bot and set your token in `.env` file.
> `TELEGRAM_BOT_TOKEN=...`

> [!WARNING]\
> If you want to use proxies, you need to set `use_proxies` to `true` and provide the proxy server details in the `proxies` section. You can add multiple proxy servers to the list. If you want to test if your proxies or your proxy server is working, you can use the following command:
> `npm run test_proxy`

To start using the Vinted Real Monitor, all you need to do is run the following command:

```sh 
git clone https://github.com/teddy-vltn/vinted-monitor 
```

```sh
npm install
```

To start the Telegram bot, use the following command:

```sh
npm run telegram
```

## Need Help?

If you encounter any issues or need help with the Vinted Real Monitor, please refer to the log file named `app.log`. It contains information about the application's activities and can help you troubleshoot any issues. https://discord.gg/HgMHRjXqhQ

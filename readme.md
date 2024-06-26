# Vinted Monitor - No Delay

Vinted Monitor is a bot that monitors the Vinted items route for new items and notifies users in real-time. It is designed to work with minimal delay, ensuring that users are always up-to-date with the latest items.

> [!TIP]
> [Discord Invite](https://discord.gg/CDv9b8cPXU) - Preview of the bot if you want to test it before installing

<p align="center">
  <img src="./doc/example_items.png" alt="Example" style="max-height: 400px; width: auto;">
</p>

## Features

- **Real-time Monitoring**: Vinted Monitor fetches the latest items from the Vinted items route in real-time.
- **Discord Integration**: The bot integrates with Discord and can send notifications to specific channels.
- **Commands**: The bot supports a variety of commands that allow users to interact with it.
- **Database Channel/User Management**: The bot can manage channels and users in a database, allowing for easy management of notifications.
- **Language Support**: The bot will communicate with users in their set Discord language. (If available, you can add your own translations in the `locales` folder.)

## Setup

1. Clone the repository and install the dependencies:

```bash
git clone https://github.com/teddy-vltn/vinted-monitor.git
cd vinted-monitor
```

2. Create a Discord bot in Discord's Developer Portal and invite it to your server:

- Go to the [Discord Developer Portal](https://discord.com/developers/applications).
- Click on "New Application" and give your bot a name.
- Go to the "Bot" tab and click on "Add Bot".
- Copy the "Client ID" and "Token" and paste them into the `.env` file.
- Give intent permissions to the bot by going to the "Bot" tab and enabling the "Presence Intent" and "Server Members Intent".
- Invite the bot with admin permissions to your server by going to the "OAuth2" tab and selecting the "bot" scope and the "Administrator" permission.
- Copy the generated URL and paste it into your browser to invite the bot to your server.

3. Modify the configuration file `.env` to suit your needs:

> [!IMPORTANT]
> You will need a rotating proxy for that to work, this bot works as follows: It makes x requests per seconds and if the vinted server has y items being posted per second and if y > x, then you will skip some items because you are not making enough requests. But if x > y, then you will get all the items.
> So the more proxy you have behind the bot, the more requests per second you can make and the less items you will skip. If you feel like it is too slow, you can increase the `ALGORITHM_CONCURRENT_REQUESTS` variable in the `.env` file, I would suggest you to start with 20 and increase it by 10 until you are satisfied with the speed.

> [!NOTE]
> You can buy rotating proxies here: [WebShare](https://www.webshare.io/?referral_code=eh8mkj0b6ral) (I get a small cut from that link so please use it if you want to support my work). I would advice you to get the "Verified Proxy" Plan and to take 100 proxy server with 1000 GB/month Bandwidth which is 7.07$/month, but i would highly suggest you take the 250 proxy server and 5000GB plan ($25.73 per month) if you want to have a good speed and avoid skipping items the most you can.

```sh
# Your discord bot client id and token
DISCORD_CLIENT_ID="1234567890123456789"
DISCORD_TOKEN="MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5"

# The user id of the bot owner, the one that will be able to create public channels
DISCORD_ADMIN_ID="987654321098765432"

# Don't change that unless you know what you are doing
MONGODB_URI="mongodb://mongodb:27017/vinted"

# Generate a good password and username https://www.avast.com/random-password-generator
MONGO_EXPRESS_USERNAME="fakeUser12345"
MONGO_EXPRESS_PASSWORD="FakePassword67890"

# Max number of private channels a user can create
USER_MAX_PRIVATE_CHANNELS_DEFAULT=5

# Allow user to create private channels (0 = false, 1 = true)
ALLOW_USER_TO_CREATE_PRIVATE_CHANNELS=1

# Auto blacklist country codes (change as you wish, for example "uk,fr,us" to blacklist UK, FR and US)
BLACKLISTED_COUNTRIES_CODES="uk"

# Max requests in the queue (more concurrent requests = more requests per second = more memory usage)
ALGORITHM_CONCURRENT_REQUESTS=35

# Rotating proxy settings config (use a socks proxy http proxy are not supported)
# Get cheap proxies here : https://www.webshare.io/?referral_code=eh8mkj0b6ral
# I would advice you to get the "Verified Proxy" Plan and to take 100 proxy server with 1000 GB/month Bandwidth which is 7.07$/month
# And go on that page : https://proxy2.webshare.io/proxy/rotating and set the protocol to socks5 and username/password authentification
PROXY_HOST="fakeproxy.webshare.io"
PROXY_PORT="8080"
PROXY_USERNAME="fakeProxyUser"
PROXY_PASSWORD="fakeProxyPassword"
```

4. Make sure you have docker installed on your machine or [Install Docker](https://docs.docker.com/engine/install/) and run the following command:

> [!IMPORTANT]
> If you are on Windows, you will need to install WSL2 alongside Docker Desktop to run the following command. You will also certainly need to activate virtualization in your BIOS.

```bash
docker-compose up -d --build
# OR
sudo docker-compose up -d --build
```

> [!IMPORTANT]
> If along the way you happen to modify the `.env` file or files in the other folders, you will need to rebuild the docker image by running the command above.

> [!TIP]
> You can also connect the bot to your own database by modifying the `.env` file, and by running simply by node by running `npm start`.

5. The bot should now be running and ready to use. And enjoy! (if it ain't working you can come to the discord server for help https://discord.gg/CDv9b8cPXU)

> [!NOTE]
> If you want to access the database, you can use the MongoDB Express interface by going to `http://localhost:8081` and logging in with the credentials you set in the `.env` file.

?. If you want to stop the bot, you can run the following command:

```bash
docker-compose down
# OR
sudo docker-compose down
```

## Usage

The bot supports a variety of commands that allow users to interact with the bot. Here are some of the available commands:
- `/create_public_channel`: Creates a public channel for the bot to send notifications.
- `/create_private_channel`: Creates a private channel for a user for the bot to send notifications.
- `/delete_public_channel`: Deletes a public channel.
- `/delete_private_channel`: Deletes a private channel.
- `/start_monitoring`: Starts monitoring the Vinted items route.
- `/stop_monitoring`: Stops monitoring the Vinted items route.
- `/set_mentions`: Sets the preferences for mentions in notifications.
- `/add_country`: Adds a country to the list of monitored countries.
- `/remove_country`: Removes a country from the list of monitored countries.
- `/info`: Displays information about Channel/User.
- `/set_max_channels`: Sets the maximum number of private channels a user can create.

## Some usage examples

- **I want to create a public channel where people on my server can see the monitored URL.**

  <p align="center">
    <img src="./doc/create_public_channel.png" alt="Create Public Channel" style="max-height: 200px; width: auto;">
  </p>

- **I want to create a private channel where I can see the monitored URL.**

  <p align="center">
    <img src="./doc/create_private_channel.png" alt="Create Private Channel" style="max-height: 200px; width: auto;">
  </p>

- **I want to make a whitelist of countries that I want to monitor but I misspell the country code.**

  <p align="center">
    <img src="./doc/add_country_error.png" alt="Add Country" style="max-height: 200px; width: auto;">
  </p>

- **I want to set mentions so I get a notification when a new item is found.**

  <p align="center">
    <img src="./doc/set_mentions.png" alt="Set Mentions" style="max-height: 200px; width: auto;">
  </p>

## Database Schema

The bot uses a database to manage channels and users. Here is the schema for the database:

<p align="center">
  <img src="./doc/relations.png" alt="Database Schema" style="max-height: 200px; width: auto;">
</p>

In this schema, preferences are a JSON object that stores the preferences for the user. When a user creates a channel, their preferences will transfer to the channel, but individual channel preferences will override the user preferences.

Available preferences:
- Countries: A list of countries to monitor.
- Language: The language of the notifications.
- Currency: The currency of the notifications.
- Mention: The mention preferences for the notifications.

> [!NOTE]
> Some preferences aren't fully supported yet.

## Regarding AutoBuy

The bot does not support autobuying items. It is designed to monitor the Vinted items route for new items and notify users in real-time. Users can then manually purchase the items they are interested in.

AutoBuy can be extremely dangerous and can lead to account suspension or even legal action. We do not condone the use of AutoBuy and will not provide support for it.

By giving access to your OAuth2 token, you are putting yourself at risk.

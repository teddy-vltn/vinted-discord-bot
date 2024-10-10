// src/services/post_service.js
import { postMessageToChannel } from "./discord_service.js";
import { createVintedItemEmbed, createVintedItemActionRow } from "../bot/components/item_embed.js";
import Logger from "../utils/logger.js";
import { Preference } from "../database.js";

const PostService = {
  sendToChannel: async (item, user, vintedChannel, token_sender, index_senders) => {
    const domain = vintedChannel.url.match(/vinted\.(.*?)\//)[1];
    const { embed, photosEmbeds } = await createVintedItemEmbed(item, domain);
    const actionRow = await createVintedItemActionRow(item, domain);

    const doMentionUser = user && vintedChannel.preferences.get(Preference.Mention);
    const mentionString = doMentionUser ? `<@${user.discordId}>` : '';

    try {
      await postMessageToChannel(
        token_sender[index_senders++ % token_sender.length],
        vintedChannel.channelId,
        `${mentionString} `,
        [embed, ...photosEmbeds],
        [actionRow]
      );
    } catch (error) {
      Logger.error('Error posting message to channel:', error);
    }
  }
};

export default PostService;

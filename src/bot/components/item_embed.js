import { EmbedBuilder, ActionRowBuilder } from "discord.js";
import { createBaseActionButton, createBaseEmbed, createBaseUrlButton } from "./base_embeds.js";
import Logger from "../../utils/logger.js";

function getNumberOfStars(rating) {
    rating = rating * 5;
    rating = Math.round(rating);

    const stars = '⭐️'.repeat(rating);
    return stars;
}

function getFlagEmoji(countryCode) {
    return countryCode.toUpperCase().replace(/./g, char => 
        String.fromCodePoint(127397 + char.charCodeAt())
    );
  }

export async function createVintedItemEmbed(item) {
    const embed = await createBaseEmbed(
        null,
        item.title,
        `📝 ${item.description}`,
        0x00FF00
    )

    embed.setURL(item.url);

    const rating = item.user.feedback_reputation;
    const ratingStars = getNumberOfStars(rating);
    const ratingTextRounded = Math.round(rating * 50) / 10;
    const ratingAllText = `${item.user.feedback_count}`;


    embed.setFields([
        //{ name: '📝 Description', value: `${item.description}`},
        { name: '💰 Price', value: `${item.priceNumeric} ${item.currency}`, inline : true},
        { name: '📏 Size', value: `${item.size} ` , inline : true },
        { name: '🏷️ Brand', value: `${item.brand} ` , inline : true },
        { name: '🌍 Country', value: `${getFlagEmoji(item.user.countryCode)} `, inline : true},
        { name: '⭐️ User Rating', value: `${ratingStars} (${ratingTextRounded}) of ${ratingAllText}`, inline : true},
        { name: '📦 Condition', value: `${item.status} `, inline : true },
        { name: '📅 Updated', value: `${item.unixUpdatedAtString} `, inline : true},
    ]);

    const photosEmbeds = []
    const maxPhotos = 3;

    // Add first photo
    const firstPhoto = item.photos[0];
    if (firstPhoto) {
        if (firstPhoto.fullSizeUrl) {
            embed.setImage(`${firstPhoto.fullSizeUrl}`);
        } else {
            Logger.error(`No fullSizeUrl for photo: ${firstPhoto}`);
            return { embed, photosEmbeds };
        }
    } else {
        Logger.error(`No photo for item: ${item}`);
        return { embed, photosEmbeds };
    }

    // Add photos
    for (let i = 1; i < item.photos.length && i < maxPhotos; i++) {
        const photo = item.photos[i];

        const photoEmbed = new EmbedBuilder()
            .setImage(`${photo.fullSizeUrl}`)
            .setURL(`${item.url}`);

        photosEmbeds.push(photoEmbed);
    }

    return { embed, photosEmbeds };
}

export async function createVintedItemActionRow(item) {
    const actionRow = new ActionRowBuilder();

    actionRow.addComponents(
        await createBaseUrlButton("🔗 View on Vinted", item.url),
        await createBaseUrlButton("📨 Send Message", `https://www.vinted.fr/items/${item.id}/want_it/new?button_name=receiver_id=${item.id}`),
        await createBaseUrlButton("💸 Buy", `https://www.vinted.fr/transaction/buy/new?source_screen=item&transaction%5Bitem_id%5D=${item.id}`)
    );

    return actionRow;
}

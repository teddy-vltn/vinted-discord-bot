import { EmbedBuilder, ActionRowBuilder } from "discord.js";
import { createBaseActionButton, createBaseEmbed, createBaseUrlButton } from "./base_embeds.js";
import Logger from "../../utils/logger.js";

function getNumberOfStars(rating) {
    rating = rating * 5;
    rating = Math.round(rating);

    const stars = '⭐️'.repeat(rating);
    return stars;
}

function replaceDomainInUrl(url, domain) {
    return url.replace(/vinted\.(.*?)\//, `vinted.${domain}/`);
}

export async function createVintedItemEmbed(item, domain = "fr") {
    // The description comes from the item page and may not arrive; the embed then goes without it.
    const hasDescription = item.description && item.description !== 'N/A';

    const embed = await createBaseEmbed(
        null,
        item.title,
        hasDescription ? `📝 ${item.description}` : ' ',
        item.getDominantColor()
    )

    embed.setURL(replaceDomainInUrl(item.url, domain));

    const fields = [
        { name: '💰 Price', value: `${item.priceNumeric} ${item.currency}`, inline : true},
        { name: '📏 Size', value: `${item.size} ` , inline : true },
        { name: '🏷️ Brand', value: `${item.brand} ` , inline : true },
        { name: '📦 Condition', value: `${item.status} `, inline : true },
    ];

    // The item update time only comes with the detail; without it the field would show 1970.
    if (item.unixUpdatedAt > 0) {
        fields.push({ name: '📅 Updated', value: `${item.unixUpdatedAtString} `, inline : true});
    }

    // The seller rating comes from the item detail, without it the field is left out.
    const rating = item.user ? item.user.feedback_reputation : 0;
    if (rating > 0) {
        const ratingStars = getNumberOfStars(rating);
        const ratingTextRounded = Math.round(rating * 50) / 10;
        fields.push({ name: '⭐️ User Rating', value: `${ratingStars} (${ratingTextRounded}) of ${item.user.feedback_count}`, inline : true});
    }

    // Discord rejects a field with an empty value and the catalog does not return some
    // fields (size, brand) for part of the items.
    embed.setFields(fields.filter(field => {
        const value = field.value.trim();
        return value && value !== 'N/A';
    }));

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
            .setURL(replaceDomainInUrl(item.url, domain));

        photosEmbeds.push(photoEmbed);
    }

    return { embed, photosEmbeds };
}

export async function createVintedItemActionRow(item, domain) {
    const actionRow = new ActionRowBuilder();

    const sendMessageUrl = `https://www.vinted.${domain}/items/${item.id}/want_it/new?button_name=receiver_id=${item.id}`;
    const buyUrl = `https://www.vinted.${domain}/transaction/buy/new?source_screen=item&transaction%5Bitem_id%5D=${item.id}`;

    actionRow.addComponents(
        await createBaseUrlButton("🔗 View on Vinted", replaceDomainInUrl(item.url, domain)),
        await createBaseUrlButton("📨 Send Message", sendMessageUrl),
        await createBaseUrlButton("💸 Buy", buyUrl)
    );

    return actionRow;
}

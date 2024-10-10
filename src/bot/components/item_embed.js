import { EmbedBuilder, ActionRowBuilder } from "discord.js";
import { createBaseActionButton, createBaseEmbed, createBaseUrlButton } from "./base_embeds.js";
import Logger from "../../utils/logger.js";
import CurrencyConverter from "currency-converter-lt";
import { CurrencyMap } from "../../database.js";

const currencyConverter = new CurrencyConverter();

let ratesCacheOptions = {
    isRatesCaching: true, // Set this boolean to true to implement rate caching
    ratesCacheDuration: 3600 // Set this to a positive number to set the number of seconds you want the rates to be cached. Defaults to 3600 seconds (1 hour)
}

currencyConverter.setupRatesCache(ratesCacheOptions);

function getNumberOfStars(rating) {
    rating = rating * 5;
    rating = Math.round(rating);

    const stars = '⭐️'.repeat(rating);
    return stars;
}

function getFlagEmoji(countryCode) {
    if (countryCode === 'uk') {
        return '🇬🇧';
    }

    return countryCode.toUpperCase().replace(/./g, char => 
        String.fromCodePoint(127397 + char.charCodeAt())
    );
  }

function replaceDomainInUrl(url, domain) {
    return url.replace(/vinted\.(.*?)\//, `vinted.${domain}/`);
}

export async function createVintedItemEmbed(item, domain = "fr") {
    const embed = await createBaseEmbed(
        null,
        item.title,
        `📝 ${item.description}`,
        item.getDominantColor()
    )

    embed.setURL(replaceDomainInUrl(item.url, domain));

    const rating = item.user.feedback_reputation;
    const ratingStars = getNumberOfStars(rating);
    const ratingTextRounded = Math.round(rating * 50) / 10;
    const ratingAllText = `${item.user.feedback_count}`;
    const targetCurrency = CurrencyMap[item.user.countryCode];
    const fromCurrency = item.currency

    let price_converted = item.priceNumeric;
    if (fromCurrency !== targetCurrency) {
        price_converted = await currencyConverter.from(fromCurrency).to(targetCurrency).amount(item.priceNumeric).convert();
        price_converted = price_converted.toFixed(2);
    }

    embed.setFields([
        { name: '💰 Price', value: `${price_converted} ${targetCurrency}`, inline : true },
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

import Logger from '../../../utils/logger.js';
import { handleYesCallback, handleNoCallback } from '../responses/messages_responses.js';

export default function handleCallback(bot, callbackQuery, vintedMonitoringService) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  Logger.debug(`Received callback query with data: ${data}`);

  if (data === 'yes') {
    handleYesCallback(bot, chatId, callbackQuery.message, vintedMonitoringService);
  } else if (data === 'no') {
    handleNoCallback(bot, chatId);
  }

  bot.answerCallbackQuery(callbackQuery.id);
}

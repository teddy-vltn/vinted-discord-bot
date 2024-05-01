import { handleStartCommand, handleHttpMessage, handleStopCommand, handleUnknownCommand } from '../responses/messages_responses.js';
import Logger from '../../../utils/logger.js';

export default async function handleMessage(bot, msg, proxyHandler) {
  const text = msg.text;
  const chatId = msg.chat.id;

  Logger.info(`Received message: ${text}, from chat ID: ${chatId}`);

  if (text === '/start') {
    handleStartCommand(bot, chatId);
  } else if (text.startsWith('http')) {
    handleHttpMessage(bot, chatId, text, proxyHandler);
  } else if (text === '/stop') {
    handleStopCommand(bot, chatId);
  } else {
    handleUnknownCommand(bot, chatId);
  }
}

import { 
  handleStartCommand, 
  handleHttpMessage, 
  handleStopCommand, 
  handleUnknownCommand,
  sendSupportReminderGithub
} from './responses/messages_responses.js';
import Logger from '../../../utils/logger.js';

export async function handleMessage(bot, msg, vintedMonitoringService) {
  const text = msg.text;
  const chatId = msg.chat.id;

  Logger.info(`Received message: ${text}, from chat ID: ${chatId}`);

  if (text === '/start') {
    handleStartCommand(bot, chatId);
  } else if (text.startsWith('http')) {
    handleHttpMessage(bot, chatId, text, vintedMonitoringService);
  } else if (text === '/stop') {
    handleStopCommand(bot, chatId);
  } else {
    handleUnknownCommand(bot, chatId);
  }

}

export async function supportMessage(bot) {
  sendSupportReminderGithub(bot);
}

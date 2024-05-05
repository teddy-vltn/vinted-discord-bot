import { 
    handleStartCommand, 
    handleHttpMessage, 
    handleStopCommand, 
    handleUnknownCommand
  } from './responses/messages_responses.js';
import Logger from '../../../utils/logger.js';

export async function handleMessage(message) {
    const text = message.content;
    Logger.info(`Received message: ${text}`);

    if (text === '/start') {
        handleStartCommand(message);
    } else if (text.startsWith('http')) {
        handleHttpMessage(message);
    } else if (text === '/stop') {
        handleStopCommand(message);
    } else {
        //handleUnknownCommand(message);
    }

}



  
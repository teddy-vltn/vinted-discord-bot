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

    // Route for when the /start command is invoked we check if there is a URL in the message
    if (text.startsWith('/start') && text.split(' ').length === 2) {
        handleHttpMessage(message);
    } else if (text === '/start') {
        handleStartCommand(message);
    } else if (text === '/stop') {
        handleStopCommand(message);
    } else {
        //handleUnknownCommand(message);
    }

}



  
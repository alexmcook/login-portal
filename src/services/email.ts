//import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { config } from '../config.js'

//const sesClient = new SESClient({ region: config.AWS_REGION });

export async function sendEmail(to: string, subject: string, body: string) {
    const sourceEmail = config.EMAIL_SOURCE;
    if (!sourceEmail) {
        throw new Error('EMAIL_SOURCE environment variable is not set');
    }

    const params = {
        Source: sourceEmail,
        Destination: {
            ToAddresses: [to],
        },
        Message: {
            Body: {
                Text: { Data: body },
            },
            Subject: { Data: subject },
        }
    };
    void params;

    try {
        //const command = new SendEmailCommand(params);
        //return await sesClient.send(command);
        return true;
    } catch { 
        throw new Error('Failed to send email');
    }
}

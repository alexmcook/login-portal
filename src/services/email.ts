import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const sesClient = new SESClient({ region: process.env.AWS_REGION });

export async function sendEmail(to: string, subject: string, body: string) {
    const sourceEmail = process.env.EMAIL_SOURCE;
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

    try {
        const command = new SendEmailCommand(params);
        console.log('Email command prepared:', command);
        return true;
        //return await sesClient.send(command);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
}

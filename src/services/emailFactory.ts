import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { config } from '../config.js'

export type EmailSender = {
  sendEmail(to: string, subject: string, body: string): Promise<any>
}

export function createRealEmail(sesClient: SESClient, cfg = config): EmailSender {
  return {
    sendEmail: async (to: string, subject: string, body: string) => {
      if (!(cfg as any).EMAIL_ENABLED) {
        console.log(`Email sending is disabled. To: ${to}, Subject: ${subject}, Body: ${body}`)
        return true
      }

      const sourceEmail = cfg.EMAIL_SOURCE
      if (!sourceEmail) {
        throw new Error('EMAIL_SOURCE environment variable is not set')
      }

      const params = {
        Source: sourceEmail,
        Destination: { ToAddresses: [to] },
        Message: {
          Body: { Text: { Data: body } },
          Subject: { Data: subject }
        }
      }

      try {
        const command = new SendEmailCommand(params)
        return await sesClient.send(command)
      } catch (err) {
        throw new Error('Failed to send email')
      }
    }
  }
}

export function createMockEmail(): EmailSender {
  return {
    sendEmail: async (to: string, subject: string, body: string) => {
      // simple noop for unit tests
      // eslint-disable-next-line no-console
      console.log(`mock sendEmail to=${to} subject=${subject}`)
      return true
    }
  }
}

import nodemailer from "nodemailer";

// Если SMTP_URL не задан, письма и СМС пишутся в журнал сервера. Так вход можно проверить локально.
// Настоящий СМС-провайдер подключается здесь, когда будет выбран.

export async function sendEmail(to: string, subject: string, text: string) {
  const url = process.env.SMTP_URL;
  if (!url) {
    console.log(`[mail:dev] → ${to}\n  ${subject}\n  ${text}`);
    return;
  }
  const transport = nodemailer.createTransport(url);
  await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}

export async function sendSms(to: string, text: string) {
  console.log(`[sms:dev] → ${to}: ${text}`);
}

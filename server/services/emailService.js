const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false // Для самоподписанных сертификатов (не для production!)
            }
        });

        // Проверка подключения к SMTP
        this.transporter.verify((error) => {
            if (error) {
                console.error('Ошибка подключения к SMTP:', error);
            } else {
                console.log('SMTP сервер готов к отправке писем');
            }
        });
    }

    async sendVerificationEmail(email, verificationToken) {
        const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

        console.log(`Отправка письма для ${email}, токен: ${verificationToken}`);

        try {
            const info = await this.transporter.sendMail({
                from: `"Music Portal" <${process.env.EMAIL_FROM}>`,
                to: email,
                subject: 'Подтверждение email',
                html: `
                    <h2>Подтвердите ваш email</h2>
                    <p>Код подтверждения: <strong>${verificationToken}</strong></p>
                    <p>Или перейдите по ссылке: 
                        <a href="${verificationUrl}">${verificationUrl}</a>
                    </p>
                `
            });

            console.log('Письмо отправлено! ID:', info.messageId);
            return true;
        } catch (error) {
            console.error('Ошибка отправки письма:', error);
            return false;
        }
    }
}

module.exports = new EmailService();
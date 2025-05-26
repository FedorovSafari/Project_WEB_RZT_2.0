const ApiError = require('../error/ApiError');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/models');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

const generateJWT = (id, nickname, email, role, isEmailVerified) => {
    return jwt.sign(
        { id, nickname, email, role, isEmailVerified },
        process.env.SECRET_KEY,
        { expiresIn: '24h' }
    );
};

class UserController {
    async verifyRecaptcha(token) {
        console.log('Начало проверки reCAPTCHA...');
        if (process.env.NODE_ENV === 'development') {
            console.warn('reCAPTCHA отключена в development');
            return true;
        }

        if (!token) {
            console.error('Токен reCAPTCHA отсутствует');
            return false;
        }

        try {
            const response = await axios.post(
                `https://www.google.com/recaptcha/api/siteverify`,
                new URLSearchParams({
                    secret: process.env.RECAPTCHA_SECRET_KEY,
                    response: token
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            console.log('Ответ от Google reCAPTCHA:', response.data);
            return response.data.success;
        } catch (error) {
            console.error('Ошибка проверки reCAPTCHA:', error.message);
            return false;
        }
    }

    async registration(req, res, next) {
        try {
            const { nickname, email, password, role = 'USER', recaptchaToken } = req.body;
            if (!nickname || !email || !password) {
                return next(ApiError.badRequest('Необходимо указать имя пользователя, email и пароль'));
            }

            // Проверка сложности пароля
            if (password.length < 8) {
                return next(ApiError.badRequest('Пароль должен содержать минимум 8 символов'));
            }

            const isRecaptchaValid = await this.verifyRecaptcha(recaptchaToken);
            if (!isRecaptchaValid) {
                return next(ApiError.badRequest('Проверка reCAPTCHA не пройдена'));
            }

            const [nicknameCandidate, emailCandidate] = await Promise.all([
                User.findOne({ where: { nickname } }),
                User.findOne({ where: { email } })
            ]);

            if (nicknameCandidate) {
                return next(ApiError.badRequest('Пользователь с таким именем уже существует'));
            }
            if (emailCandidate) {
                return next(ApiError.badRequest('Пользователь с таким email уже существует'));
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const emailVerificationToken = Math.floor(100000 + Math.random() * 900000).toString();
            const emailVerificationTokenExpires = new Date(Date.now() + process.env.EMAIL_VERIFICATION_EXPIRES_HOURS * 60 * 60 * 1000);

            const user = await User.create({
                nickname,
                email,
                role,
                password: hashedPassword,
                emailVerificationToken,
                emailVerificationTokenExpires,
                isEmailVerified: false
            });

            // Отправляем email с подтверждением
            const emailSent = await emailService.sendVerificationEmail(email, emailVerificationToken);
            if (!emailSent) {
                console.error('Не удалось отправить email с подтверждением');
                // Продолжаем, так как пользователь может запросить повторную отправку
            }

            return res.json({
                message: 'Регистрация успешна. Пожалуйста, проверьте ваш email для подтверждения.',
                requiresEmailVerification: true
            });

        } catch (error) {
            return next(ApiError.internal(error.message));
        }
    }

    async login(req, res, next) {
        try {
            const { email, password, recaptchaToken } = req.body;

            // Проверка reCAPTCHA
            const isRecaptchaValid = await this.verifyRecaptcha(recaptchaToken);
            if (!isRecaptchaValid) {
                return next(ApiError.badRequest('Проверка reCAPTCHA не пройдена'));
            }

            // Поиск пользователя
            const user = await User.findOne({ where: { email } });
            if (!user) {
                return next(ApiError.unauthorized('Неверные учетные данные'));
            }

            // Проверка пароля
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return next(ApiError.unauthorized('Неверные учетные данные'));
            }

            // Проверка подтверждения email
            if (!user.isEmailVerified) {
                return next(ApiError.forbidden('Email не подтвержден. Пожалуйста, проверьте ваш почтовый ящик.'));
            }

            // Генерация токена
            const token = generateJWT(user.id, user.nickname, user.email, user.role, user.isEmailVerified);

            // Установка HTTP-only куки
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000, // 24 часа
                sameSite: 'strict'
            });

            return res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    nickname: user.nickname,
                    isEmailVerified: user.isEmailVerified
                }
            });

        } catch (error) {
            return next(ApiError.internal(error.message));
        }
    }

    async verifyEmail(req, res, next) {
        try {
            const { token } = req.body;

            if (!token) {
                return next(ApiError.badRequest('Токен подтверждения не предоставлен'));
            }

            const user = await User.findOne({
                where: {
                    emailVerificationToken: token,
                    emailVerificationTokenExpires: { [Op.gt]: new Date() }
                }
            });

            if (!user) {
                return next(ApiError.badRequest('Недействительный или просроченный токен подтверждения'));
            }

            // Обновляем пользователя
            user.isEmailVerified = true;
            user.emailVerificationToken = null;
            user.emailVerificationTokenExpires = null;
            await user.save();

            // Автоматически входим пользователя после подтверждения
            const jwtToken = generateJWT(user.id, user.nickname, user.email, user.role, user.isEmailVerified);

            res.cookie('authToken', jwtToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: 'strict'
            });

            return res.json({
                user: {
                    id: user.id,
                    nickname: user.nickname,
                    email: user.email,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified
                },
                message: 'Email успешно подтвержден!'
            });

        } catch (error) {
            return next(ApiError.internal(error.message));
        }
    }

    async resendVerificationEmail(req, res, next) {
        try {
            const { email } = req.body;

            // Генерируем короткий код (6 цифр)
            const newToken = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = new Date(Date.now() + 15 * 60000); // 15 минут

            const user = await User.findOne({ where: { email } });

            if (!user) {
                return res.status(404).json({ error: "Пользователь не найден" });
            }

            // Обновляем токен и время его жизни
            await user.update({
                emailVerificationToken: newToken,
                emailVerificationTokenExpires: expires
            });

            // Отправляем письмо с новым кодом
            const emailSent = await emailService.sendVerificationEmail(email, newToken);

            if (!emailSent) {
                return res.status(500).json({ error: "Не удалось отправить письмо" });
            }

            return res.json({
                success: true,
                message: "Новый код подтверждения отправлен",
                token: newToken // Для тестирования (в продакшене не возвращайте)
            });

        } catch (error) {
            console.error('Ошибка повторной отправки:', error);
            return res.status(500).json({ error: "Внутренняя ошибка сервера" });
        }
    }

    async check(req, res, next) {
        try {
            if (!req.user.isEmailVerified) {
                return next(ApiError.forbidden('Email не подтвержден. Пожалуйста, проверьте ваш почтовый ящик.'));
            }

            const token = generateJWT(req.user.id, req.user.nickname, req.user.email, req.user.role, req.user.isEmailVerified);

            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: 'strict'
            });

            return res.json({
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    role: req.user.role,
                    nickname: req.user.nickname,
                    isEmailVerified: req.user.isEmailVerified
                }
            });
        } catch (error) {
            return next(ApiError.internal(error.message));
        }
    }

    async logout(req, res, next) {
        try {
            // Очищаем куку
            res.clearCookie('authToken');
            return res.json({ message: 'Вы успешно вышли' });

        } catch (error) {
            return next(ApiError.internal(error.message));
        }
    }
    async requestPasswordReset(req, res, next) {
        try {
            const { email } = req.body;

            if (!email) {
                return next(ApiError.badRequest('Email обязателен'));
            }

            // Ищем пользователя
            const user = await User.findOne({ where: { email } });
            if (!user) {
                // Для безопасности не сообщаем, что пользователь не найден
                return res.json({
                    message: 'Если пользователь с таким email существует, на него будет отправлен код подтверждения'
                });
            }

            // Генерируем 6-значный OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

            // Сохраняем OTP в базе данных
            user.passwordResetOtp = otp;
            user.passwordResetOtpExpires = otpExpires;
            await user.save();

            // Отправляем OTP на email
            const emailSent = await emailService.sendPasswordResetOtp(email, otp);
            if (!emailSent) {
                console.error('Не удалось отправить OTP');
                return next(ApiError.internal('Ошибка при отправке OTP'));
            }

            res.json({
                message: 'Код подтверждения отправлен на ваш email',
                email: email // Для демонстрации, в production лучше не возвращать
            });

        } catch (error) {
            return next(ApiError.internal(error.message));
        }
    }

    async verifyOtp(req, res, next) {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                return next(ApiError.badRequest('Email и OTP обязательны'));
            }

            // Ищем пользователя
            const user = await User.findOne({
                where: {
                    email,
                    passwordResetOtp: otp,
                    passwordResetOtpExpires: { [Op.gt]: new Date() }
                }
            });

            if (!user) {
                return next(ApiError.badRequest('Неверный или просроченный OTP'));
            }

            // Генерируем токен для сброса пароля
            const resetToken = uuidv4();
            const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

            // Сохраняем токен
            user.passwordResetToken = resetToken;
            user.passwordResetTokenExpires = resetTokenExpires;
            user.passwordResetOtp = null; // Очищаем OTP после использования
            user.passwordResetOtpExpires = null;
            await user.save();

            res.json({
                success: true,
                resetToken,
                message: 'OTP подтвержден. Теперь вы можете установить новый пароль.'
            });

        } catch (error) {
            return next(ApiError.internal(error.message));
        }
    }

    async resetPassword(req, res, next) {
        try {
            const { resetToken, newPassword, confirmPassword } = req.body;

            console.log('Received resetToken:', resetToken); // Логирование

            if (!resetToken) {
                return next(ApiError.badRequest('Токен сброса отсутствует'));
            }


            if (!resetToken || !newPassword || !confirmPassword) {
                return next(ApiError.badRequest('Все поля обязательны'));
            }

            if (newPassword !== confirmPassword) {
                return next(ApiError.badRequest('Пароли не совпадают'));
            }

            // Проверка сложности пароля
            if (newPassword.length < 8) {
                return next(ApiError.badRequest('Пароль должен содержать минимум 8 символов'));
            }

            // Ищем пользователя с действительным токеном
            const user = await User.findOne({
                where: {
                    passwordResetToken: resetToken,
                    passwordResetTokenExpires: { [Op.gt]: new Date() }
                }
            });

            if (!user) {
                console.log('Invalid token or expired for:', resetToken);
                return next(ApiError.badRequest('Недействительный или просроченный токен сброса'));
            }

            // Хешируем новый пароль
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Обновляем пароль и очищаем токены
            user.password = hashedPassword;
            user.passwordResetToken = null;
            user.passwordResetTokenExpires = null;
            await user.save();

            res.json({
                success: true,
                message: 'Пароль успешно изменен. Теперь вы можете войти с новым паролем.'
            });

        } catch (error) {
            return next(ApiError.internal(error.message));
        }
    }
}

module.exports = new UserController();
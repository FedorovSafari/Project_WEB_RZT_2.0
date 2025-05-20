const ApiError = require('../error/ApiError');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/models');
const axios = require('axios');

const generateJWT = (id, nickname, email, role) => {
    return jwt.sign(
        { id, nickname, email, role },
        process.env.SECRET_KEY,
        { expiresIn: '24h' }
    );
};

class UserController {
    async verifyRecaptcha(token) {
        console.log('Начало проверки reCAPTCHA...'); // Логирование
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
            const user = await User.create({ nickname, email, role, password: hashedPassword });
            const token = generateJWT(user.id, user.nickname, user.email, user.role);

            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: 'strict'
            });

            return res.json({
                user: { id: user.id, nickname: user.nickname, email: user.email, role: user.role }
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

            // Генерация токена
            const token = generateJWT(user.id, user.nickname, user.email, user.role);

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
                    role: user.role
                }
            });

        } catch (error) {
            return next(ApiError.internal(error.message));
        }
    }

    async check(req, res, next) {
        try {
            const token = generateJWT(req.user.id, req.user.nickname, req.user.email, req.user.role);

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
                    nickname: req.user.nickname
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
}

module.exports = new UserController();
const ApiError = require('../error/ApiError');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/models');

const generateJWT = (id, email, role) => {
    return jwt.sign(
        { id, email, role },
        process.env.SECRET_KEY,
        { expiresIn: '24h' }
    );
};

class UserController {
    async registration(req, res, next) {
        try {
            const { email, password, role = 'USER' } = req.body;

            // Валидация
            if (!email || !password) {
                return next(ApiError.badRequest('Некорректный email или пароль'));
            }

            // Проверка существования пользователя
            const candidate = await User.findOne({ where: { email } });
            if (candidate) {
                return next(ApiError.badRequest('Пользователь с таким email уже существует'));
            }

            // Хеширование пароля
            const hashedPassword = await bcrypt.hash(password, 10);

            // Создание пользователя
            const user = await User.create({
                email,
                role,
                password: hashedPassword
            });

            // Генерация токена
            const token = generateJWT(user.id, user.email, user.role);

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

    async login(req, res, next) {
        try {
            const { email, password } = req.body;

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
            const token = generateJWT(user.id, user.email, user.role);

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
            // Пользователь уже доступен через middleware
            const token = generateJWT(req.user.id, req.user.email, req.user.role);

            // Обновляем куку
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
                    role: req.user.role
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
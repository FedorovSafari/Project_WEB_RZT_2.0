const jwt = require('jsonwebtoken');
const ApiError = require('../error/ApiError');

module.exports = function(req, res, next) {
    try {
        // Проверяем токен в куках или заголовке Authorization
        const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return next(ApiError.unauthorized('Не авторизован'));
        }

        // Верифицируем токен
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        // После верификации токена добавим проверку:
        if (!decoded.isEmailVerified) {
            res.clearCookie('authToken');
            return next(ApiError.forbidden('Email не подтвержден. Пожалуйста, проверьте ваш почтовый ящик.'));
        }

        // Проверяем, не истек ли токен
        if (decoded.exp * 1000 < Date.now()) {
            res.clearCookie('authToken');
            return next(ApiError.unauthorized('Сессия истекла'));
        }

        req.user = decoded;
        next();
    } catch (error) {
        // Очищаем куку при ошибке верификации
        res.clearCookie('authToken');

        if (error.name === 'TokenExpiredError') {
            return next(ApiError.unauthorized('Сессия истекла'));
        }
        if (error.name === 'JsonWebTokenError') {
            return next(ApiError.unauthorized('Недействительный токен'));
        }

        console.error('Auth middleware error:', error);
        return next(ApiError.unauthorized('Ошибка авторизации'));
    }
};
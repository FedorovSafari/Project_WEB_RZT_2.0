const jwt = require('jsonwebtoken');
const ApiError = require('../error/ApiError');

module.exports = function(req, res, next) {
    try {
        // Получаем токен из куков
        const token = req.cookies.token;

        if (!token) {
            return next(ApiError.unauthorized('Не авторизован'));
        }

        // Верифицируем токен
        req.user = jwt.verify(token, process.env.SECRET_KEY);

        next();
    } catch (error) {
        // Если токен невалидный - очищаем куку
        res.clearCookie('authToken');
        return next(ApiError.unauthorized('Не авторизован'));
    }
};
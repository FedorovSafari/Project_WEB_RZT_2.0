const axios = require('axios');
const ApiError = require('../error/ApiError');

module.exports = async function(req, res, next) {
    try {
        // Пропускаем OPTIONS запросы
        if (req.method === 'OPTIONS') {
            return next();
        }

        // Получаем токен от клиента
        const token = req.headers['recaptcha-token'] || req.body.recaptchaToken;

        if (!token) {
            console.log('reCAPTCHA token not provided');
            return next(ApiError.forbidden('Требуется проверка reCAPTCHA'));
        }

        // Проверяем токен с Google
        const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`);

        if (!response.data.success) {
            console.log('reCAPTCHA verification failed:', response.data['error-codes']);
            return next(ApiError.forbidden('Не удалось проверить reCAPTCHA'));
        }

        // Проверяем score (рекомендуется 0.5 или выше)
        if (response.data.score < parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || 0.5)) {
            console.log('reCAPTCHA score too low:', response.data.score);
            return next(ApiError.forbidden('Подозрительная активность обнаружена'));
        }

        // Если все проверки пройдены
        next();
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        return next(ApiError.internal('Ошибка при проверке reCAPTCHA'));
    }
};
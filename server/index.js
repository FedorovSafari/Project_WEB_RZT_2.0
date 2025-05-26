require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
const cors = require('cors');
const router = require('./routes/index');
const errorHandler = require('./middleware/ErrorHandingMiddleware');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const app = express();
const PORT = process.env.PORT || 9000
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const slowDown = require('express-slow-down');
const winston = require('winston');
const expressWinston = require('express-winston');
const methodOverride = require('method-override');
const fileUpload = require('express-fileupload');

// Защита от NoSQL и XSS
app.use(mongoSanitize());
app.use(xss());

// Защита от перебора паролей
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 5,
    delayMs: 100
});
app.use('/login', speedLimiter);
app.use('/register', speedLimiter);

// Логирование безопасности
app.use(expressWinston.logger({
    transports: [new winston.transports.File({ filename: 'security.log' })],
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    requestWhitelist: ['headers', 'query', 'body'],
    responseWhitelist: ['body']
}));

// Ограничение методов
app.use(methodOverride('_method', {
    methods: ['POST', 'GET']
}));

// Защита файловых загрузок
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: '/tmp/',
    safeFileNames: true,
    preserveExtension: true
}));

// Защитные middleware
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        scriptSrc: ["'self'", "'unsafe-inline'", "https://www.google.com", "https://www.gstatic.com"],
        frameSrc: ["'self'", "https://www.google.com"],
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://via.placeholder.com", "https://*.last.fm", "https://lastfm.freetls.fastly.net", "*"], // Разрешаем изображения с Last.fm и других источников
        connectSrc: ["'self'", process.env.CLIENT_URL || 'http://localhost:12000', "https://ws.audioscrobbler.com"],
        mediaSrc: ["'self'", "data:", "blob:"]
    }
}));


const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 500, // limit each IP to 500 requests per windowMs
    message: 'Слишком много запросов, попробуйте позже'
});
app.use(limiter);

// CORS настройки
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:12000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
}));

app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));


// CSRF защита (исключая API маршруты)
const csrfProtection = csrf({ cookie: true });
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    csrfProtection(req, res, next);
});

// Отдача статических файлов с безопасными заголовками
app.use(express.static(path.join(__dirname, '../client'), {
    setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
    }
}));

// API Routes
app.use('/api', router);

// Обработка 404
app.use((req, res, next) => {
    res.status(404).json({ message: 'Not Found' });
    console.log('\n[REQUEST]', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        headers: req.headers
    });
    next();
});

// Обработка ошибок
app.use(errorHandler);

// Запуск приложения
const start = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: false });

        app.listen(PORT, () => console.log(`Сервер запущен на порту http://localhost:${PORT}`));
    } catch (e) {
        console.error('Ошибка запуска сервера:', e);
        process.exit(1);
    }
};

start().catch(err => {
    console.error('Фатальная ошибка при запуске:', err);
    process.exit(1);
});
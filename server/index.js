require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
const cors = require('cors');
const router = require('./routes/index');
const errorHandler = require('./middleware/ErrorHandingMiddleware');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 6000;
// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:9000',
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Отдача статических файлов из папки client
app.use(express.static(path.join(__dirname, '../client')));

// API Routes
app.use('/api', router);

// Обработка 404 (должен быть перед errorHandler)
app.use((req, res, next) => {
    res.status(404).json({ message: 'Not Found' });
    console.log('\n[REQUEST]', {
        method: req.method,
        url: req.url,
        body: req.body,
        headers: req.headers
    });
    next();
});

//Обработка ошибок (последний middleware)
app.use(errorHandler);

// const { saveArtistData } = require('./API_2/dataHandler');
// (async () => {
//    try {
//        const artistName = 'ALBLAK 52';
//        console.log(`Начинается сохранение данных для артиста: ${artistName}`);
//        await saveArtistData(artistName);
//        console.log(`Данные артиста "${artistName}" успешно сохранены.`);
//    } catch (error) {
//        console.error('Ошибка при сохранении данных артиста:', error);
//    }
// })();


// Запуск приложения
const start = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });




        app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));

    } catch (e) {
        console.error('Ошибка запуска сервера:', e);
        process.exit(1);
    }
};

start().catch(err => {
    console.error('Фатальная ошибка при запуске:', err);
    process.exit(1);
});

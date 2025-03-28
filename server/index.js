require('dotenv').config();
const express = require('express');
const sequelize = require('./db');
const cors = require('cors');
const router = require('./routes/index');
const errorHandler = require('./middleware/ErrorHandingMiddleware');
const app = express();

const { fetchAndSaveArtists } = require('./API/loading_artist');
const { fetchAndSaveGenres } = require('./API/loading_genre');
const { fetchAndSaveTracks } = require('./API/loading_track');
const { fetchAndSaveAlbums } = require('./API/loading_album');



app.use(cors());
app.use(express.json());
app.use('/api', router);
app.use(errorHandler);

const PORT = process.env.PORT || 6000;
const artistNames = ['boulevard depo'];
const tracksLimit = 10;
// Запуск приложения
const start = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();

        app.listen(PORT, () =>
            console.log(`Server started on port ${PORT}`)
    );

        // Загружаем данные артистов после старта сервера
        await fetchAndSaveArtists(artistNames);

        // Загружаем жанры после старта сервера
        await fetchAndSaveGenres();

        // Загружаем треки для каждого артиста
       // for (const artistName of artistNames) {
        //    await fetchAndSaveTracks(artistName, tracksLimit);
      //  }

        // Загружаем альбомы для каждого артиста
        for (const artistName of artistNames) {
            await fetchAndSaveAlbums(artistName);
        }


    } catch (e) {
        console.log(e);
    }
};


start();

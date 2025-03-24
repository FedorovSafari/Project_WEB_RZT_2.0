const axios = require('axios');
const { Artist, Album } = require('../models/models'); // Импортируем модели

// Функция для загрузки альбомов артиста из Last.fm
async function fetchAndSaveAlbums(artistName) {
    try {
        console.log(`Fetching albums for artist: ${artistName} from Last.fm...`);

        // Отправляем запрос к Last.fm API
        const response = await axios.get('http://ws.audioscrobbler.com/2.0/', {
            params: {
                method: 'artist.gettopalbums',
                artist: artistName,
                api_key: process.env.API_KEY,
                format: 'json',
            },
        });

        const albums = response.data.topalbums.album; // Получаем массив альбомов

        // Проверяем, существует ли артист в базе данных
        const artist = await Artist.findOne({ where: { name: artistName } });
        if (!artist) {
            console.error(`Artist ${artistName} not found in the database.`);
            return;
        }

        // Сохраняем каждый альбом в базу данных
        for (const album of albums) {
            const albumTitle = album.name; // Название альбома
            const albumImg = album.image?.[2]?.['#text'] || ''; // Изображение альбома (если доступно)

            console.log(`Saving album: ${albumTitle} for artist: ${artistName}`);

            // Находим или создаем альбом
            await Album.findOrCreate({
                where: { title: albumTitle, ArtistId: artist.id },
                defaults: {
                    duration: 0, // Продолжительность можно обновить позже
                    date: new Date(), // Используем текущую дату как fallback (Last.fm не всегда предоставляет дату)
                    img: albumImg,
                },
            });
        }

        console.log(`Albums for artist ${artistName} successfully saved to the database.`);
    } catch (error) {
        console.error(`Error fetching albums for artist ${artistName}:, error`);
    }
}

module.exports = { fetchAndSaveAlbums };

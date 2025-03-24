const axios = require('axios');
const { Genre } = require('../models/models'); // Импорт модели Genre

// Функция для загрузки музыкальных жанров из Last.fm
async function fetchAndSaveGenres() {
    try {
        console.log('Fetching genres from Last.fm...');

        // Отправляем запрос к Last.fm API
        const response = await axios.get('http://ws.audioscrobbler.com/2.0/', {
            params: {
                method: 'chart.gettoptags', // Метод для получения популярных тегов (жанров)
                api_key: process.env.API_KEY, // Ваш API-ключ
                format: 'json',
            },
        });

        const tags = response.data.tags.tag; // Массив популярных тегов (жанров)

        // Сохраняем жанры в базу данных
        for (const tag of tags) {
            const genreName = tag.name; // Имя жанра
            console.log(`Saving genre: ${genreName}`);

            // Используем findOrCreate, чтобы избежать дублирования
            await Genre.findOrCreate({
                where: { name: genreName },
            });
        }

        console.log('Genres successfully saved to the database.');
    } catch (error) {
        console.error('Error fetching genres from Last.fm:', error);
    }
}

module.exports = { fetchAndSaveGenres };

require('dotenv').config();
const axios = require('axios');
const { Artist } = require('../models/models.js');

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const PLACEHOLDER_IMAGE = process.env.PLACEHOLDER_IMAGE;

// Функция для получения данных об артисте из Last.fm
const getArtistInfo = async (artistName) => {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                method: 'artist.getinfo',
                artist: artistName,
                api_key: API_KEY,
                format: 'json',
            },
        });

        if (response.data && response.data.artist) {
            const artist = response.data.artist;

            const image =
                artist.image && artist.image.length > 0
                    ? artist.image.find((img) => img.size === 'medium')
                    : null;

            return {
                name: artist.name,
                bio:
                    artist.bio && artist.bio.summary
                        ? artist.bio.summary
                        : 'Описание отсутствует',
                img: image && image['#text'] ? image['#text'] : PLACEHOLDER_IMAGE,
            };
        } else {
            console.log(`Артист "${artistName}" не найден.`);
            return null;
        }
    } catch (error) {
        console.error(`Ошибка при получении данных об артисте "${artistName}":, error`);
        return null;
    }
};

// Функция для сохранения артиста в базу данных
const saveArtistToDB = async (artistData) => {
    try {
        const existingArtist = await Artist.findOne({
            where: { name: artistData.name },
        });
        if (existingArtist) {
            console.log(`Артист "${artistData.name}" уже существует в базе данных.`);
            return;
        }

        await Artist.create({
            name: artistData.name,
            bio: artistData.bio || 'Нет информации',
            img: artistData.img,
        });

        console.log(`Артист "${artistData.name}" успешно сохранен в базу данных!`);
    } catch (error) {
        console.error('Ошибка при сохранении артиста в базу данных:', error);
    }
};

// Функция для поиска и сохранения одного артиста
const fetchAndSaveArtist = async (artistName) => {
    const artistData = await getArtistInfo(artistName); // Получаем данные об артисте из Last.fm
    if (artistData) {
        await saveArtistToDB(artistData); // Сохраняем данные в базу
    } else {
        console.log(`Не удалось найти или сохранить артиста "${artistName}".`);
    }
};

// Функция для поиска и сохранения нескольких артистов
const fetchAndSaveArtists = async (artistNames) => {
    for (const artistName of artistNames) {
        console.log(`Загружаем данные для артиста: ${artistName}`);
        await fetchAndSaveArtist(artistName); // Используем уже существующую функцию
    }
};

// Экспорт функций для использования в других файлах
module.exports = {
    fetchAndSaveArtist,
    fetchAndSaveArtists,
};

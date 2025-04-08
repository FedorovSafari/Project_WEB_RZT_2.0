const { Track, Album, Artist, Genre } = require('../models/models.js'); // Импортируем модели
const { Op } = require('sequelize');
// Поиск треков
async function searchTracks(query) {
    try {
        const tracks = await Track.findAll({
            where: {
                title: {
                    [Op.iLike]: `%${query}%`, // Поиск по названию трека (регистронезависимый)
                },
            },
            include: [
                { model: Artist, attributes: ['name'] }, // Включаем информацию об артисте
                { model: Genre, attributes: ['name'] },   // Включаем информацию о жанре
            ],
            limit: 6, // Ограничиваем количество результатов
        });
        return tracks;
    } catch (error) {
        console.error('Ошибка при поиске треков:', error);
        throw error;
    }
}

// Поиск альбомов
async function searchAlbums(query) {
    try {
        const albums = await Album.findAll({
            where: {
                title: {
                    [Op.iLike]: `%${query}%`, // Поиск по названию альбома (регистронезависимый)
                },
            },
            include: [
                { model: Artist, attributes: ['name'] }, // Включаем информацию об артисте
                { model: Genre, attributes: ['name'] }, // Включаем информацию о жанре
            ],
            limit: 6, // Ограничиваем количество результатов
        });
        return albums;
    } catch (error) {
        console.error('Ошибка при поиске альбомов:', error);
        throw error;
    }
}

// Поиск артистов
async function searchArtists(query) {
    try {
        const artists = await Artist.findAll({
            where: {
                name: {
                    [Op.iLike]: `%${query}%`, // Поиск по имени артиста (регистронезависимый)
                },
            },
            limit: 6, // Ограничиваем количество результатов
        });
        return artists;
    } catch (error) {
        console.error('Ошибка при поиске артистов:', error);
        throw error;
    }
}

module.exports = { searchTracks, searchAlbums, searchArtists };
const { Artist, Album, Track } = require('../models/models');
const lastFmService = require('./lastFmService');

// Функция для сохранения артиста и его данных в БД
async function saveArtistData(artistName) {
    try {
        // Получаем информацию об артисте
        const artistInfo = await lastFmService.getArtistInfo(artistName);

        // Сохраняем артиста в БД
        const artist = await Artist.create({
            name: artistInfo.name,
            bio: artistInfo.bio.content || '',
            img: artistInfo.image[3]['#text'] // Берем изображение высокого качества
        });

        // Получаем альбомы артиста
        const albums = await lastFmService.getArtistAlbums(artistName);

        for (const album of albums) {
            // Получаем треки альбома
            const tracks = await lastFmService.getAlbumTracks(artistName, album.name);

            // Сохраняем только альбомы с минимум двумя треками
            if (tracks.length >= 2) {
                const savedAlbum = await Album.create({
                    title: album.name,
                    duration: tracks.reduce((sum, track) => sum + parseFloat(track.duration || 0), 0),
                    date: new Date(), // Здесь можно заменить на реальную дату релиза
                    img: album.image[3]['#text'], // Изображение высокого качества
                    ArtistId: artist.id // Связь с артистом
                });

                // Сохраняем треки альбома
                for (const track of tracks) {
                    await Track.create({
                        title: track.name,
                        duration: parseFloat(track.duration || 0),
                        date: new Date(), // Здесь можно заменить на реальную дату релиза
                        audioFile: '', // Можно добавить путь к файлу, если есть
                        img: album.image[3]['#text'],
                        AlbumId: savedAlbum.id, // Связь с альбомом
                        ArtistId: artist.id // Связь с артистом
                    });
                }
            }
        }

        // Получаем топ-треки артиста (не из альбомов)
        const topTracks = await lastFmService.getTopTracks(artistName);

        let nonAlbumTracksCount = 0;
        for (const track of topTracks) {
            if (nonAlbumTracksCount >= 5) break;

            // Проверяем, что трек не относится к альбому
            if (!track.album || !track.album.title) {
                await Track.create({
                    title: track.name,
                    duration: parseFloat(track.duration || 0),
                    date: new Date(),
                    audioFile: '',
                    img: track.image[3]['#text'],
                    ArtistId: artist.id
                });
                nonAlbumTracksCount++;
            }
        }

        console.log(`Данные артиста "${artistName}" успешно сохранены.`);
    } catch (error) {
        console.error(`Ошибка при обработке артиста "${artistName}":, error`);
    }
}

module.exports = { saveArtistData };

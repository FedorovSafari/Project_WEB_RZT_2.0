const { Artist, Album, Track, Genre } = require('../models/models');
const lastFmService = require('./lastfmService');

async function seedDatabase(artistName) {
    try {
        // Получаем информацию об артисте
        const artistInfo = await lastFmService.getArtistInfo(artistName);

        // Сохраняем артиста в базу данных
        const [artist, created] = await Artist.findOrCreate({
            where: { name: artistInfo.name },
            defaults: {
                bio: artistInfo.bio.summary,
                img: artistInfo.image?.[3]['#text'] || null, // URL изображения артиста
            },
        });

        console.log(`Артист ${artist.name} ${created ? 'создан' : 'уже существует'}`);

        // Получаем топ-альбомы артиста
        const topAlbums = await lastFmService.getTopAlbums(artistName);

        for (const album of topAlbums) {
            // Сохраняем альбом в базу данных
            const [albumEntry, albumCreated] = await Album.findOrCreate({
                where: { title: album.name },
                defaults: {
                    duration: 0, // Продолжительность альбома (можно рассчитать позже)
                    date: new Date(), // Дата выхода (если доступна)
                    img: album.image?.[3]['#text'] || null, // URL изображения альбома
                    ArtistId: artist.id,
                },
            });

            console.log(`Альбом ${album.name} ${albumCreated ? 'создан' : 'уже существует'}`);

            // Получаем треки альбома
            const tracks = await lastFmService.getAlbumTracks(album.name, artistName);

            for (const track of tracks) {
                // Сохраняем трек в базу данных
                const [trackEntry, trackCreated] = await Track.findOrCreate({
                    where: { title: track.name },
                    defaults: {
                        duration: parseFloat(track.duration) || 0,
                        date: new Date(), // Дата выхода трека (если доступна)
                        audioFile: '', // Аудиофайл (можно добавить позже)
                        img: album.image?.[3]['#text'] || null, // URL изображения трека
                        ArtistId: artist.id,
                        AlbumId: albumEntry.id,
                    },
                });

                console.log(`Трек ${track.name} ${trackCreated ? 'создан' : 'уже существует'}`);
            }
        }

        // Сохраняем жанры артиста
        if (artistInfo.tags && artistInfo.tags.tag) {
            for (const tag of artistInfo.tags.tag) {
                const [genre, genreCreated] = await Genre.findOrCreate({
                    where: { name: tag.name },
                });

                console.log(`Жанр ${tag.name} ${genreCreated ? 'создан' : 'уже существует'}`);

                // Связываем жанр с артистом
                await artist.addGenre(genre);
            }
        }

        console.log('Заполнение базы данных завершено.');
    } catch (error) {
        console.error('Ошибка при заполнении базы данных:', error.message);
    }
}

module.exports = seedDatabase;



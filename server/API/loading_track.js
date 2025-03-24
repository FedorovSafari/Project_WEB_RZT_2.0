const axios = require('axios');
const { Track, Artist, Album } = require('../models/models'); // Импортируем модели

// Функция для загрузки треков артиста из Last.fm
async function fetchAndSaveTracks(artistName, limit = 10) {
    try {
        console.log(`Fetching tracks for artist: ${artistName} from Last.fm...`);

        // Отправляем запрос к Last.fm API
        const response = await axios.get('http://ws.audioscrobbler.com/2.0/', {
            params: {
                method: 'artist.gettoptracks',
                artist: artistName,
                api_key: process.env.API_KEY,
                format: 'json',
                limit,
            },
        });

        const tracks = response.data.toptracks.track; // Получаем массив треков

        // Находим или создаем артиста в базе данных
        const [artist] = await Artist.findOrCreate({
            where: { name: artistName },
            defaults: {
                bio: 'Описание недоступно', // Укажите значение по умолчанию
                img: '', // Вы можете обновить это позже
            },
        });

        // Сохраняем каждый трек в базу данных
        for (const track of tracks) {
            const trackTitle = track.name;
            const trackDuration = track.duration / 60; // Продолжительность в минутах
            const albumName = track.album?.title || 'Unknown Album'; // Название альбома (если доступно)
            const albumImg = track.image?.[2]?.['#text'] || ''; // Изображение альбома (если доступно)

            // Если API предоставляет дату релиза, используйте её. Если нет — установите null.
            let releaseDate = null;
            if (track.date && track.date.uts) {
                releaseDate = new Date(parseInt(track.date.uts) * 1000); // Конвертируем UNIX timestamp в дату
            }


            // Находим или создаем альбом
            const [album] = await Album.findOrCreate({
                where: { title: albumName, ArtistId: artist.id },
                defaults: {
                    duration: 0, // Можно обновить позже
                    date: releaseDate || new Date(), // Используем дату релиза или текущую дату как fallback
                    img: albumImg,
                },
            });

            console.log(`Saving track: ${trackTitle}`);

            // Сохраняем трек
            await Track.findOrCreate({
                where: { title: trackTitle, ArtistId: artist.id, AlbumId: album.id },
                defaults: {
                    duration: trackDuration,
                    date: releaseDate || new Date(), // Используем дату релиза или текущую дату как fallback
                    audioFile: '', // Вы можете обновить это позже
                    img: albumImg,
                },
            });
        }

        console.log(`Tracks for artist ${artistName} successfully saved to the database.`);
    } catch (error) {
        console.error(`Error fetching tracks for artist ${artistName}:, error`);
    }
}

module.exports = { fetchAndSaveTracks };

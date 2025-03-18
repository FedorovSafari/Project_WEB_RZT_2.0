const Router = require('express')
const router = new Router()
const UserRouter = require('./UserRouter')
const { Track, Artist } = require('../models/models');
const { searchTracks, searchAlbums, searchArtists } = require('../controllers/searchController');

router.get('/tracks/recent', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : null; // Получаем limit из query параметров

        const tracks = await Track.findAll({
            order: [['date', 'DESC']], // Сортировка по дате (от новых к старым)
            limit: limit, // Используем limit, если он указан
        });

        res.json(tracks);
    } catch (error) {
        console.error('Ошибка при загрузке треков:', error);
        res.status(500).json({ error: 'Ошибка при загрузке треков' });
    }
});

router.get('/tracks/:id', async (req, res) => {
    try {
        const track = await Track.findByPk(req.params.id);
        if (!track) {
            return res.status(404).json({ error: 'Трек не найден' });
        }
        res.json(track);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при загрузке трека' });
    }
});

// Маршрут для поиска
router.get('/search', async (req, res) => {
    const query = req.query.query;

    if (!query) {
        return res.status(400).json({ error: 'Поисковый запрос не указан' });
    }

    try {
        const tracks = await searchTracks(query);
        const albums = await searchAlbums(query);
        const artists = await searchArtists(query);
        res.json({ tracks, albums, artists });
    } catch (error) {
        console.error('Ошибка при поиске:', error);
        res.status(500).json({ error: 'Ошибка при выполнении поиска' });
    }
});

// Маршрут для получения всех треков с именами артистов
router.get('/tracks', async (req, res) => {
    try {
        const tracks = await Track.findAll({
            include: [
                {
                    model: Artist,
                    attributes: ['name'], // Выбираем только имя артиста
                    required: false, // LEFT JOIN, чтобы треки без артиста тоже возвращались
                },
            ],
        });

        // Преобразуем данные для удобства
        const formattedTracks = tracks.map(track => ({
            id: track.id,
            title: track.title,
            img: track.img,
            date: track.date,
            Artist: track.Artist ? { name: track.Artist.name } : null,
        }));

        res.json(formattedTracks);
    } catch (error) {
        console.error('Ошибка при загрузке треков:', error);
        res.status(500).json({ error: 'Ошибка при загрузке треков' });
    }
});

router.use('/user', UserRouter)

module.exports = router;
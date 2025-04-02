const { Router } = require('express');
const router = Router();

// Импорт контроллеров
const {
    getRecentTracks,
    getRecentAlbums,
    getRecentReleases,
    getRecentArtists,
    getTrackById,
    searchAll,
    getAllTracks
} = require('../controllers/trackController');

const UserRouter = require('./UserRouter');

// Маршруты для треков
router.get('/tracks/recent', getRecentTracks);
router.get('/tracks', getAllTracks);
router.get('/tracks/:id', getTrackById);

// Маршруты для альбомов
router.get('/albums/recent', getRecentAlbums);

// Маршруты для артистов
router.get('/artists/recent', getRecentArtists);

// Комбинированные релизы
router.get('/releases/recent', getRecentReleases);

// Поиск
router.get('/search', searchAll);

// Пользовательские маршруты
router.use('/user', UserRouter);

module.exports = router;
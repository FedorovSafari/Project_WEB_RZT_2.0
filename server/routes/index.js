const { Router } = require('express');
const router = Router();
const authMiddleware = require('../middleware/authMiddleware')

// Импорт контроллеров
const {
    getRecentTracks,
    getRecentAlbums,
    getRecentReleases,
    getRecentArtists,
    getTrackById,
    getAlbumById,
    searchAll,
    getAllTracks,
    getArtistById,
    getArtistTracks,
    getArtistAlbums
} = require('../controllers/trackController');

// Импорт контроллеров для рецензий
const {
    createReview,
    getTrackReviews,
    getAlbumReviews,
    deleteReview,
    getPopularReviews,
    getRecentReviews
} = require('../controllers/reviewController');

const UserRouter = require('./UserRouter');
const likeRouter = require('./likeRouter');

// Маршруты для треков
router.get('/tracks/recent', getRecentTracks);
router.get('/tracks', getAllTracks);
router.get('/tracks/:id', getTrackById);

// Маршруты для рецензий
router.post('/reviews', authMiddleware, createReview);
router.get('/tracks/:id/reviews', authMiddleware, getTrackReviews);
router.get('/albums/:id/reviews', authMiddleware, getAlbumReviews);
router.delete('/reviews/:id',authMiddleware, deleteReview);
router.get('/reviews/popular', getPopularReviews);
router.get('/reviews/recent', getRecentReviews);

// Маршруты для альбомов
router.get('/albums/recent', getRecentAlbums);
router.get('/albums/:id', getAlbumById);

// Маршруты для артистов
router.get('/artists/recent', getRecentArtists);
router.get('/artists/:id', getArtistById);
router.get('/artists/:id/tracks', getArtistTracks);
router.get('/artists/:id/albums', getArtistAlbums);

// Комбинированные релизы
router.get('/releases/recent', getRecentReleases);

// Поиск
router.get('/search', searchAll);

// Пользовательские маршруты
router.use('/user', UserRouter);
router.use('/like', likeRouter);

module.exports = router;
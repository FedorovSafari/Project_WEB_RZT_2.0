const Router = require('express');
const likeController = require('../controllers/likeController');
const router = new Router();
const authMiddleware = require('../middleware/authMiddleware');

// Добавление лайка
router.post('/', authMiddleware, likeController.addLike);

// Проверка лайка
router.get('/check', authMiddleware, likeController.checkLike);

// Удаление лайка
router.delete('/', authMiddleware, likeController.removeLike);

// Получение количества лайков
router.get('/track/:trackId/count', likeController.getTrackLikesCount);
router.get('/album/:albumId/count', likeController.getAlbumLikesCount);
router.get('/artist/:artistId/count', likeController.getArtistLikesCount);
router.get('/review/:reviewId/count', likeController.getReviewLikesCount);

// Получение лайков пользователя
router.get('/user/:userId', authMiddleware, likeController.getUserLikes);

module.exports = router;
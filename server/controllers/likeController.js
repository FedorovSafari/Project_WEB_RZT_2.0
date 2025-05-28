const { Like, Track, Album, Artist, Review } = require('../models/models');
const ApiError = require('../error/ApiError');

class LikeController {
    // Добавление лайка
    async addLike(req, res, next) {
        try {
            const { userId, TrackId, AlbumId, ArtistId, ReviewId } = req.body;

            // Проверяем, что лайк ставится только одной сущности
            const targetEntities = [TrackId, AlbumId, ArtistId, ReviewId].filter(Boolean);
            if (targetEntities.length !== 1) {
                return next(ApiError.badRequest('Лайк должен относиться только к одной сущности'));
            }

            // Проверяем, не ставил ли пользователь уже лайк этой сущности
            const existingLike = await Like.findOne({
                where: {
                    UserId: userId,
                    ...(TrackId && { TrackId }),
                    ...(AlbumId && { AlbumId }),
                    ...(ArtistId && { ArtistId }),
                    ...(ReviewId && { ReviewId })
                }
            });

            if (existingLike) {
                return next(ApiError.badRequest('Вы уже поставили лайк этой сущности'));
            }
            const like = await Like.create({
                UserId: userId,
                TrackId,
                AlbumId,
                ArtistId,
                ReviewId
            });

            return res.json(like);
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    // Проверка, поставил ли пользователь лайк
    async checkLike(req, res, next) {
        try {
            const { userId, TrackId, AlbumId, ArtistId, ReviewId } = req.query;

            const like = await Like.findOne({
                where: {
                    UserId: userId,
                    ...(TrackId && { TrackId }),
                    ...(AlbumId && { AlbumId }),
                    ...(ArtistId && { ArtistId }),
                    ...(ReviewId && { ReviewId })
                }
            });

            return res.json({ hasLike: !!like });
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    // Удаление лайка
    async removeLike(req, res, next) {
        try {
            const { userId, TrackId, AlbumId, ArtistId, ReviewId } = req.body;

            const like = await Like.findOne({
                where: {
                    UserId: userId,
                    ...(TrackId && { TrackId }),
                    ...(AlbumId && { AlbumId }),
                    ...(ArtistId && { ArtistId }),
                    ...(ReviewId && { ReviewId })
                }
            });

            if (!like) {
                return next(ApiError.notFound('Лайк не найден'));
            }

            await like.destroy();
            return res.json({ message: 'Лайк успешно удален' });
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    // Получение количества лайков для трека
    async getTrackLikesCount(req, res, next) {
        try {
            const { trackId } = req.params;
            const count = await Like.count({
                where: { TrackId: trackId }
            });
            return res.json({ count });
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    // Получение количества лайков для альбома
    async getAlbumLikesCount(req, res, next) {
        try {
            const { albumId } = req.params;
            const count = await Like.count({
                where: { AlbumId: albumId }
            });
            return res.json({ count });
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    // Получение количества лайков для артиста
    async getArtistLikesCount(req, res, next) {
        try {
            const { artistId } = req.params;
            const count = await Like.count({
                where: { ArtistId: artistId }
            });
            return res.json({ count });
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    // Получение количества лайков для рецензии
    async getReviewLikesCount(req, res, next) {
        try {
            const { reviewId } = req.params;
            const count = await Like.count({
                where: { ReviewId: reviewId }
            });
            return res.json({ count });
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    // Получение всех лайков пользователя
    async getUserLikes(req, res, next) {
        try {
            const { UserId } = req.params;
            const likes = await Like.findAll({
                where: { UserId },
                include: [
                    { model: Track, as: 'Track' },
                    { model: Album, as: 'Album' },
                    { model: Artist, as: 'Artist' },
                    { model: Review, as: 'Review' }
                ]
            });
            return res.json(likes);
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }
}

module.exports = new LikeController();
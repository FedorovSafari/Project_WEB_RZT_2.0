const { Review, User, Track, Album, Artist } = require('../models/models');
const sequelize = require('../db');

// Функция для получения artistId по trackId
async function getArtistIdByTrackId(trackId) {
    try {
        const track = await Track.findByPk(trackId, {
            include: [{
                model: Artist,
                attributes: ['id']
            }]
        });

        if (!track) {
            throw new Error('Трек не найден');
        }

        if (!track.Artist) {
            throw new Error('Артист не найден для данного трека');
        }

        return track.Artist.id;
    } catch (error) {
        console.error('Ошибка при получении artistId:', error);
        throw error;
    }
}

// Создание рецензии (обновленная версия)
exports.createReview = async (req, res) => {
    try {
        // Проверка аутентификации
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Необходима авторизация' });
        }

        const { trackId, albumId, head, description, estimation } = req.body;

        // Валидация данных
        if ((!trackId && !albumId) || !head || !description || !estimation) {
            return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
        }

        if (trackId && albumId) {
            return res.status(400).json({ error: 'Укажите либо трек, либо альбом, но не оба сразу' });
        }

        if (estimation < 1 || estimation > 10) {
            return res.status(400).json({ error: 'Оценка должна быть от 1 до 10' });
        }

        let artistId;

        if (trackId) {
            console.log('track: ',trackId)
            // Получаем artistId для трека
            try {
                artistId = await getArtistIdByTrackId(trackId);
            } catch (error) {
                return res.status(404).json({ error: error.message });
            }

            // Проверяем существование трека
            const track = await Track.findByPk(trackId);
            if (!track) {
                return res.status(404).json({ error: 'Трек не найден' });
            }

            // Создаем рецензию для трека
            const review = await Review.create({
                head,
                description,
                estimation,
                TrackId: trackId,
                AlbumId: track.albumId || null,
                ArtistId: artistId,
                UserId: req.user.id,
                like: 0
            });

            const reviewWithDetails = await Review.findByPk(review.id, {
                include: [
                    { model: User, attributes: ['id', 'email', 'nickname'] },
                    { model: Track, attributes: ['id', 'title'] },
                    { model: Album, attributes: ['id', 'title'] },
                    { model: Artist, attributes: ['id', 'name'] }
                ]
            });

            return res.status(201).json(reviewWithDetails);
        } else {
            // Для альбома получаем artistId напрямую из альбома
            console.log('################################# ',albumId)
            const album = await Album.findByPk(albumId);
            if (!album) {
                return res.status(404).json({ error: 'Альбом не найден' });
            }

            artistId = album.artistId;

            // Создаем рецензию для альбома
            const review = await Review.create({
                head,
                description,
                estimation,
                AlbumId: albumId,
                ArtistId: artistId,
                UserId: req.user.id,
                like: 0
            });

            const reviewWithDetails = await Review.findByPk(review.id, {
                include: [
                    { model: User, attributes: ['id', 'email', 'nickname'] },
                    { model: Album, attributes: ['id', 'title'] },
                    { model: Artist, attributes: ['id', 'name'] }
                ]
            });

            return res.status(201).json(reviewWithDetails);
        }
    } catch (error) {
        console.error('Ошибка при создании рецензии:', error);
        res.status(500).json({
            error: 'Ошибка при создании рецензии',
            details: error.message
        });
    }
};

// Получение рецензий для трека
exports.getTrackReviews = async (req, res) => {
    try {
        const TrackId = req.params.id;

        // Проверка наличия trackId
        if (!TrackId) {
            return res.status(400).json({ error: 'Не указан ID трека' });
        }

        const reviews = await Review.findAll({
            where: { TrackId },
            include: [
                { model: User, attributes: ['id', 'email', 'nickname'] },
                { model: Track, attributes: ['id', 'title'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(reviews);
    } catch (error) {
        console.error('Ошибка при загрузке рецензий трека:', error);
        res.status(500).json({
            error: 'Ошибка при загрузке рецензий трека',
            details: error.message
        });
    }
};

// Получение рецензий для альбома
exports.getAlbumReviews = async (req, res) => {
    try {
        const albumId = req.params.id;

        // Проверка наличия albumId
        if (!albumId) {
            return res.status(400).json({ error: 'Не указан ID альбома' });
        }

        const reviews = await Review.findAll({
            where: { AlbumId: albumId },
            include: [
                { model: User, attributes: ['id', 'email', 'nickname'] },
                { model: Album, attributes: ['id', 'title'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(reviews);
    } catch (error) {
        console.error('Ошибка при загрузке рецензий альбома:', error);
        res.status(500).json({
            error: 'Ошибка при загрузке рецензий альбома',
            details: error.message
        });
    }
};

// Удаление рецензии
exports.deleteReview = async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Необходима авторизация' });

    try {
        const review = await Review.findOne({
            where: { id: req.params.id}
        });

        if (!review) {
            return res.status(404).json({ error: 'Рецензия не найдена или у вас нет прав' });
        }

        await review.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при удалении рецензии' });
    }
};

// Лайк рецензии
exports.likeReview = async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Необходима авторизация' });

    try {
        const review = await Review.findByPk(req.params.id);
        if (!review) return res.status(404).json({ error: 'Рецензия не найдена' });
        const Like = review.like + 1
        await review.update({
            like: Like
        });

        res.json({ success: true, like: review.like });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при добавлении лайка' });
    }
};

// Получение популярных рецензий (с наибольшим количеством лайков)
exports.getPopularReviews = async (req, res) => {
    try {
        const reviews = await Review.findAll({
            include: [
                { model: User, attributes: ['id', 'nickname'] },
                { model: Track, attributes: ['id', 'title'], required: false },
                { model: Album, attributes: ['id', 'title'], required: false },
                { model: Artist, attributes: ['id', 'name'] }
            ],
            order: [['like', 'DESC']],
            limit: 2
        });

        res.json(reviews);
    } catch (error) {
        console.error('Ошибка при загрузке популярных рецензий:', error);
        res.status(500).json({
            error: 'Ошибка при загрузке популярных рецензий',
            details: error.message
        });
    }
};

// Получение последних рецензий
exports.getRecentReviews = async (req, res) => {
    try {
        const reviews = await Review.findAll({
            include: [
                { model: User, attributes: ['id', 'nickname'] },
                { model: Track, attributes: ['id', 'title'], required: false },
                { model: Album, attributes: ['id', 'title'], required: false },
                { model: Artist, attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 2
        });

        res.json(reviews);
    } catch (error) {
        console.error('Ошибка при загрузке последних рецензий:', error);
        res.status(500).json({
            error: 'Ошибка при загрузке последних рецензий',
            details: error.message
        });
    }
};
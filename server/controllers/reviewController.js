const { Review, User, Track, Album, Artist, Like } = require('../models/models');
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

// Получение популярных рецензий (с наибольшим количеством лайков)
exports.getPopularReviews = async (req, res) => {
    try {
        // Получаем популярные рецензии
        const popularReviews = await Review.findAll({
            attributes: ['id', 'head', 'description', 'createdAt'],
            include: [
                {
                    model: User,
                    attributes: ['nickname']
                },
                {
                    model: Track,
                    attributes: ['id', 'title'],
                    required: false
                },
                {
                    model: Album,
                    attributes: ['id', 'title'],
                    required: false
                },
                {
                    model: Artist,
                    attributes: ['id', 'name'],
                    required: false
                },
                {
                    model: Like,
                    attributes: [],
                    required: false
                }
            ],
            group: ['Review.id', 'User.id', 'Track.id', 'Album.id', 'Artist.id'],
            order: [[sequelize.fn('COUNT', sequelize.col('Likes.id')), 'DESC']],
            limit: 2,
            subQuery: false
        });

        if (!popularReviews || popularReviews.length === 0) {
            return res.status(404).json({
                message: 'Популярные рецензии не найдены'
            });
        }

        // Форматируем данные для ответа
        const formattedReviews = popularReviews.map(review => {
            const baseReview = {
                id: review.id,
                title: review.head,
                text: review.description,
                createdAt: review.createdAt,
                user: {
                    nickname: review.User.nickname
                }
            };

            // Определяем тип сущности (трек, альбом)
            if (review.Track) {
                baseReview.entity = {
                    type: 'track',
                    title: review.Track.title
                };
            } else if (review.Album) {
                baseReview.entity = {
                    type: 'album',
                    title: review.Album.title
                };
            }

            return baseReview;
        });
        res.json({
            success: true,
            count: formattedReviews.length,
            reviews: formattedReviews
        });

    } catch (error) {
        console.error('Ошибка при загрузке популярных рецензий:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Получение последних рецензий
exports.getRecentReviews = async (req, res) => {
    try {
        // Получаем последние рецензии с дополнительной информацией
        const recentReviews = await Review.findAll({
            attributes: ['id', 'head', 'description', 'createdAt'],
            include: [
                {
                    model: User,
                    attributes: ['nickname']
                },
                {
                    model: Track,
                    attributes: ['id', 'title'],
                    required: false
                },
                {
                    model: Album,
                    attributes: ['id', 'title'],
                    required: false
                },
                {
                    model: Artist,
                    attributes: ['id', 'name'],
                    required: false
                },
                {
                    model: Like,
                    attributes: [],
                    required: false
                }
            ],
            group: ['Review.id', 'User.id', 'Track.id', 'Album.id', 'Artist.id'],
            order: [['createdAt', 'DESC']],
            limit: 2,
            subQuery: false
        });

        if (!recentReviews || recentReviews.length === 0) {
            return res.status(404).json({
                message: 'Последние рецензии не найдены'
            });
        }

        // Форматируем данные для ответа
        const formattedReviews = recentReviews.map(review => {
            const baseReview = {
                id: review.id,
                title: review.head,
                text: review.description,
                createdAt: review.createdAt,
                likesCount: review.Likes ? review.Likes.length : 0,
                user: {
                    nickname: review.User.nickname
                }
            };

            // Определяем тип сущности (трек, альбом)
            if (review.Track) {
                baseReview.entity = {
                    type: 'track',
                    title: review.Track.title
                };
            } else if (review.Album) {
                baseReview.entity = {
                    type: 'album',
                    title: review.Album.title
                };
            }

            return baseReview;
        });

        res.json({
            success: true,
            count: formattedReviews.length,
            reviews: formattedReviews
        });

    } catch (error) {
        console.error('Ошибка при загрузке последних рецензий:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const { Track, Album, Artist } = require('../models/models');
const ApiError = require('../error/ApiError');
const {Op} = require("sequelize");

module.exports = {
    /**
     * Получение последних треков
     */
    getRecentTracks: async (req, res, next) => {
        try {
            const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 100) : 10; // Ограничиваем максимум 100

            const tracks = await Track.findAll({
                order: [['date', 'DESC']],
                limit: limit,
                include: [{
                    model: Artist,
                    attributes: ['id', 'name', 'img']
                }],
                raw: true,
                nest: true
            });

            // Форматируем ответ
            const formattedTracks = tracks.map(track => ({
                id: track.id,
                title: track.title,
                duration: track.duration,
                img: track.img,
                date: track.date,
                artist: track.Artist
            }));

            res.json(formattedTracks);
        } catch (error) {
            next(ApiError.internal('Ошибка при загрузке треков'));
        }
    },

    /**
     * Получение последних альбомов
     */
    getRecentAlbums: async (req, res, next) => {
        try {
            const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 50) : 10;

            const albums = await Album.findAll({
                order: [['date', 'DESC']],
                limit: limit,
                include: [{
                    model: Artist,
                    attributes: ['id', 'name', 'img']
                }]
            });

            res.json(albums);
        } catch (error) {
            next(ApiError.internal('Ошибка при загрузке альбомов'));
        }
    },

    /**
     * Получение комбинированных релизов (треки + альбомы)
     */
    getRecentReleases: async (req, res, next) => {
        try {
            const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 20) : 6;

            const [tracks, albums] = await Promise.all([
                Track.findAll({
                    order: [['date', 'DESC']],
                    limit: limit,
                    include: [{
                        model: Artist,
                        attributes: ['id', 'name', 'img']
                    }]
                }),
                Album.findAll({
                    order: [['date', 'DESC']],
                    limit: limit,
                    include: [{
                        model: Artist,
                        attributes: ['id', 'name', 'img']
                    }]
                })
            ]);

            // Объединяем и сортируем
            const releases = [...tracks, ...albums]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, limit)
                .map(item => ({
                    ...item.get({ plain: true }),
                    type: item instanceof Track ? 'track' : 'album'
                }));

            res.json(releases);
        } catch (error) {
            next(ApiError.internal('Ошибка при загрузке релизов'));
        }
    },

    /**
     * Получение последних артистов
     */
    getRecentArtists: async (req, res, next) => {
        try {
            const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 50) : 10;

            const artists = await Artist.findAll({
                order: [['createdAt', 'DESC']],
                limit: limit,
                attributes: ['id', 'name', 'img', 'description']
            });

            res.json(artists);
        } catch (error) {
            next(ApiError.internal('Ошибка при загрузке артистов'));
        }
    },

    /**
     * Получение трека по ID
     */
    getTrackById: async (req, res, next) => {
        try {
            const track = await Track.findByPk(req.params.id, {
                include: [{
                    model: Artist,
                    attributes: ['id', 'name', 'img']
                }]
            });

            if (!track) {
                return next(ApiError.notFound('Трек не найден'));
            }

            res.json(track);
        } catch (error) {
            next(ApiError.internal('Ошибка при загрузке трека'));
        }
    },

    /**
     * Получение всех треков с артистами
     */
    getAllTracks: async (req, res, next) => {
        try {
            const tracks = await Track.findAll({
                include: [{
                    model: Artist,
                    attributes: ['id', 'name', 'img'],
                    required: false
                }]
            });

            res.json(tracks.map(track => ({
                ...track.get({ plain: true }),
                artist: track.Artist || null
            })));
        } catch (error) {
            next(ApiError.internal('Ошибка при загрузке треков'));
        }
    },

    /**
     * Поиск по трекам, альбомам и артистам
     */
    searchAll: async (req, res, next) => {
        try {
            const query = req.query.query;

            if (!query || query.length < 2) {
                return next(ApiError.badRequest('Поисковый запрос должен содержать минимум 2 символа'));
            }

            const searchQuery = `%${query}%`;

            const [tracks, albums, artists] = await Promise.all([
                // Поиск треков
                Track.findAll({
                    where: {
                        title: {
                            [Op.iLike]: searchQuery
                        }
                    },
                    limit: 10,
                    include: [{
                        model: Artist,
                        attributes: ['id', 'name']
                    }]
                }),

                // Поиск альбомов
                Album.findAll({
                    where: {
                        [Op.or]: [
                            { title: { [Op.iLike]: searchQuery } },
                            { description: { [Op.iLike]: searchQuery } }
                        ]
                    },
                    limit: 10,
                    include: [{
                        model: Artist,
                        attributes: ['id', 'name']
                    }]
                }),

                // Поиск артистов
                Artist.findAll({
                    where: {
                        name: {
                            [Op.iLike]: searchQuery
                        }
                    },
                    limit: 10
                })
            ]);

            res.json({
                tracks: tracks.map(t => t.get({ plain: true })),
                albums: albums.map(a => a.get({ plain: true })),
                artists: artists.map(a => a.get({ plain: true }))
            });
        } catch (error) {
            next(ApiError.internal('Ошибка при выполнении поиска'));
        }
    }
};
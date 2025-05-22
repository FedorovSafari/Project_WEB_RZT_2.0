const { Track, Album, Artist } = require('../models/models');
const ApiError = require('../error/ApiError');
const {Op} = require("sequelize");
const {searchArtists, searchAlbums, searchTracks} = require('./searchController')

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
                //limit: limit,
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
            const limit = 6;

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
            console.log('artist')
            const artists = await Artist.findAll({
                //order: [['name', 'DESC']],
                //limit: limit,
                attributes: ['id', 'name', 'img', 'bio']
            });
            console.log(artists)

            res.json(artists);
        } catch (error) {
            next(ApiError.internal('Ошибка при загрузке артистов'));
        }
    },

    /**
     * Получение артиста по ID
     */
    getArtistById: async (req, res, next) => {
        try {
            const artist = await Artist.findByPk(req.params.id, {
                attributes: ['name', 'bio', 'img']
            });
            if (!artist) {
                return next(ApiError.badRequest('Артист не найден'));
            }

            res.json(artist);
        } catch (error) {
            console.error('Ошибка при получении артиста:', error);
            next(ApiError.internal('Ошибка при загрузке артиста'));
        }
    },

    /**
     * Получение треков артиста
     */
    getArtistTracks: async (req, res, next) => {
        try {
            const { limit = 5, sort = 'popular' } = req.query;
            const tracks = await Track.findAll({
                where: { ArtistId: req.params.id },
                limit: parseInt(limit),
                //attributes: ['id', 'name', 'img', 'date']
            });
            res.json(tracks.map(track => ({
                ...track.get({ plain: true }),
                artist: track.Artist,
            })));
        } catch (error) {
            next(ApiError.internal('Ошибка при загрузке треков артиста'));
        }
    },

    /**
     * Получение альбомов артиста
     */
    getArtistAlbums: async (req, res, next) => {
        try {
            const albums = await Album.findAll({
                where: { ArtistId: req.params.id },
                //attributes: ['id', 'title', 'img', 'date', 'type'],
                //order: [['date', 'DESC']]
            });

            res.json(albums.map(album => ({
                ...album.get({ plain: true }),
                artist: album.Artist
            })));
        } catch (error) {
            next(ApiError.internal('Ошибка при загрузке альбомов артиста'));
        }
    },

    /**
     * Получение трека по ID
     */
    getTrackById: async (req, res, next) => {
        try {
            console.log('id: ',req.params)
            const track = await Track.findByPk(req.params.id, {
                include: [{
                    model: Artist,
                    attributes: ['id', 'name', 'img']
                }]
            });

            if (!track) {
                return next(ApiError.badRequest('Трек не найден'));
            }

            res.json(track);
        } catch (error) {
            next(ApiError.internal('Ошибка при загрузке трека'));
        }
    },

    /**
     * Получение альбома по ID
     */
    getAlbumById: async (req, res, next) => {
        try {
            const album = await Album.findByPk(req.params.id, {
                include: [
                    {
                        model: Artist,
                        attributes: ['id', 'name', 'img']
                    },
                    {
                        model: Track,
                        attributes: ['id', 'title', 'duration', 'img'],
                        include: [{
                            model: Artist,
                            attributes: ['id', 'name']
                        }]
                    }
                ]
            });

            if (!album) {
                return next(ApiError.badRequest('Альбом не найден'));
            }

            // Форматируем ответ для удобства
            const response = {
                id: album.id,
                title: album.title,
                year: album.year,
                img: album.img,
                artist: album.Artist,
                tracks: album.Track
            };

            res.json(response);
        } catch (error) {
            console.error('Ошибка при получении альбома:', error);
            next(ApiError.internal('Ошибка при загрузке альбома'));
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
            console.log('Search', searchQuery)
            const [tracks, albums, artists] = await Promise.all([
                searchTracks(searchQuery),
                searchAlbums(searchQuery),
                searchArtists(searchQuery)
            ]);
            console.log('Search2', searchQuery)

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
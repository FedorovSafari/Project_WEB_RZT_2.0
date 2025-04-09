const axios = require('axios');

const apiKey = process.env.LASTFM_API_KEY;
const baseUrl = 'http://ws.audioscrobbler.com/2.0/';

const lastFmService = {
    async getArtistInfo(artistName) {
        const response = await axios.get(baseUrl, {
            params: {
                method: 'artist.getinfo',
                artist: artistName,
                api_key: apiKey,
                format: 'json',
            },
        });
        return response.data.artist;
    },

    async getTopAlbums(artistName) {
        const response = await axios.get(baseUrl, {
            params: {
                method: 'artist.gettopalbums',
                artist: artistName,
                api_key: apiKey,
                format: 'json',
            },
        });
        return response.data.topalbums.album;
    },

    async getAlbumTracks(albumName, artistName) {
        const response = await axios.get(baseUrl, {
            params: {
                method: 'album.getinfo',
                album: albumName,
                artist: artistName,
                api_key: apiKey,
                format: 'json',
            },
        });
        return response.data.album.tracks.track;
    },
};

module.exports = lastFmService;

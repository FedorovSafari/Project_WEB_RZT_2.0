const axios = require('axios');

const API_KEY = process.env.LASTFM_API_KEY; // Убедитесь, что ключ добавлен в .env
const BASE_URL = 'http://ws.audioscrobbler.com/2.0/';

// Функция для получения информации об артистах
async function getArtistInfo(artistName) {
    const response = await axios.get(BASE_URL, {
        params: {
            method: 'artist.getinfo',
            artist: artistName,
            api_key: API_KEY,
            format: 'json'
        }
    });
    return response.data.artist;
}

// Функция для получения альбомов артиста
async function getArtistAlbums(artistName) {
    const response = await axios.get(BASE_URL, {
        params: {
            method: 'artist.gettopalbums',
            artist: artistName,
            api_key: API_KEY,
            format: 'json'
        }
    });
    return response.data.topalbums.album;
}

// Функция для получения треков альбома
async function getAlbumTracks(artistName, albumTitle) {
    const response = await axios.get(BASE_URL, {
        params: {
            method: 'album.getinfo',
            artist: artistName,
            album: albumTitle,
            api_key: API_KEY,
            format: 'json'
        }
    });
    return response.data.album.tracks.track;
}

// Функция для получения топ-треков артиста
async function getTopTracks(artistName) {
    const response = await axios.get(BASE_URL, {
        params: {
            method: 'artist.gettoptracks',
            artist: artistName,
            api_key: API_KEY,
            format: 'json'
        }
    });
    return response.data.toptracks.track;
}

module.exports = {
    getArtistInfo,
    getArtistAlbums,
    getAlbumTracks,
    getTopTracks
};

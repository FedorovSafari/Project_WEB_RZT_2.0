const sequelize = require('../db')
const {DataTypes} = require('sequelize')

const User = sequelize.define('User', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    email: {type: DataTypes.STRING, unique: true},
    password: {type: DataTypes.STRING},
    role: {type: DataTypes.STRING, defaultValue: 'USER'},
})

const Track = sequelize.define('Track', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    title: {type: DataTypes.STRING, allowNull: false},
    duration: {type: DataTypes.FLOAT, allowNull: false}, // продолжительность трека
    date: {type: DataTypes.DATE, allowNull: false}, // дата выхода трека
    audioFile: {type: DataTypes.STRING, allowNull: false},
    img: {type: DataTypes.STRING, allowNull: false},
})

const Genre = sequelize.define('Genre', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, allowNull: false, unique: true},
})

const Album = sequelize.define('Album', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    title: {type: DataTypes.STRING, allowNull: false},
    duration: {type: DataTypes.INTEGER, allowNull: false},
    date: {type: DataTypes.DATE, allowNull: false}, // дата выхода альбома
    img: {type: DataTypes.STRING, allowNull: false},
})

const Artist = sequelize.define('Artist', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, allowNull: false},
    bio: {type: DataTypes.TEXT, allowNull: false},
    img: {type: DataTypes.STRING, allowNull: false},
})

Artist.hasMany(Track);
Track.belongsTo(Artist);

Genre.hasMany(Track);
Track.belongsTo(Genre);

Artist.hasMany(Album);
Album.belongsTo(Artist);

Genre.hasMany(Album);
Album.belongsTo(Genre);

Album.hasMany(Track);
Track.belongsTo(Album);

Artist.belongsToMany(Genre, { through: 'ArtistGenre' });
Genre.belongsToMany(Artist, { through: 'ArtistGenre' });


module.exports = {
    User,
    Track,
    Genre,
    Album,
    Artist
}

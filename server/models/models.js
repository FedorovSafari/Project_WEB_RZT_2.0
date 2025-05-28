const sequelize = require('../db')
const {DataTypes} = require('sequelize')

const User = sequelize.define('User', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    nickname: {type: DataTypes.STRING, allowNull: false, unique: true},
    email: {type: DataTypes.STRING, unique: true},
    password: {type: DataTypes.STRING},
    role: {type: DataTypes.STRING, defaultValue: 'USER'},
    isEmailVerified: {type: DataTypes.BOOLEAN, defaultValue: false},
    emailVerificationToken: {type: DataTypes.STRING},
    emailVerificationTokenExpires: {type: DataTypes.DATE},
    passwordResetCode: { type: DataTypes.STRING(6) },
    passwordResetCodeExpires: { type: DataTypes.DATE },
    passwordResetOtp: {type: DataTypes.STRING},
    passwordResetOtpExpires: {type: DataTypes.DATE},
    passwordResetToken: { type: DataTypes.STRING },
    passwordResetTokenExpires: { type: DataTypes.DATE }
})

const Track = sequelize.define('Track', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    title: {type: DataTypes.STRING, allowNull: false},
    duration: {type: DataTypes.FLOAT, allowNull: false},
    date: {type: DataTypes.DATE, allowNull: false},
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
    date: {type: DataTypes.DATE, allowNull: false},
    img: {type: DataTypes.STRING, allowNull: false},
})

const Artist = sequelize.define('Artist', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, allowNull: false},
    bio: {type: DataTypes.TEXT, allowNull: false},
    img: {type: DataTypes.STRING, allowNull: false},
})

const Review = sequelize.define('Review', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    head: {type: DataTypes.STRING, allowNull: false},
    description: {type: DataTypes.TEXT, allowNull: false},
    estimation: {type: DataTypes.INTEGER, allowNull: false},
})

const Profile = sequelize.define('Profile', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    bio: {type: DataTypes.TEXT, allowNull: false},
    img: {type: DataTypes.STRING, allowNull: false},
})

const Like = sequelize.define('Like', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
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

User.hasMany(Review);
Review.belongsTo(User);

Artist.hasMany(Review);
Review.belongsTo(Artist);

Album.hasMany(Review);
Review.belongsTo(Album);

Track.hasMany(Review);
Review.belongsTo(Track);

User.hasOne(Profile, {
    foreignKey: 'userId',
    onDelete: 'CASCADE'
});
Profile.belongsTo(User, {
    foreignKey: 'userId'
});

User.hasMany(Like);
Like.belongsTo(User);

Track.hasMany(Like);
Like.belongsTo(Track);

Album.hasMany(Like);
Like.belongsTo(Album);

Artist.hasMany(Like);
Like.belongsTo(Artist);

Review.hasMany(Like);
Like.belongsTo(Review);

module.exports = {
    User,
    Track,
    Genre,
    Album,
    Artist,
    Review,
    Profile,
    Like
}
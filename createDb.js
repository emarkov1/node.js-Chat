var mongoose = require('lib/mongoose');
var async = require('async');

// 1. Drop database
// 2. create & save 3 users
// 3. close connection

async.series([
    open,
    dropDatabase,
    requireModels,
    createUsers
], function (err, results) {
    console.log(arguments);
    mongoose.disconnect();

    process.exit(err ? 255 : 0)
});

function open(callback) {
    mongoose.connection.on('open', callback);
}

function dropDatabase(callback) {
    var db = mongoose.connection.db;
    db.dropDatabase(callback);
}

function requireModels(callback) {
    require('models/user');
    async.each(Object.keys(mongoose.models), function (modelName, callback) {
        mongoose.models[modelName].ensureIndexes(callback)
    }, callback);
}

function createUsers(callback) {

    var users = [
        {username: 'Петя', password: 'kosha123'},
        {username: 'Вася', password: 'kosha123'},
        {username: 'admin', password: 'kosha123'}
    ];

    async.each(users, function (userData, callback) {
        var user = new mongoose.models.User(userData);
        user.save(callback);
    }, callback);
}
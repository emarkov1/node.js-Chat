var log = require('lib/log')(module);
var async = require('async');
var config = require('config');
var cookieParser = require('cookie-parser');
var sessionStore = require('lib/sessionStore');
var HttpError = require('error').HttpError;
var User = require('models/user').User;

function loadSession(sid, callback) {
    sessionStore.load(sid, function (err, session) {
        if (arguments.length == 0) {
            //no arguments => no session
            return callback(null, null);
        } else {
            return callback(null, session);
        }
    });
}

function loadUser(session, callback) {
    if (!session.user) {
        return callback(null, null);
    }

    User.findById(session.user, function (err, user) {
        if (err) return callback(err);

        if (!user) {
            return callback(null, null);
        }

        callback(null, user);
    })
}

module.exports = function (server) {

    var secret = config.get('session:secret');
    var sessionKey = config.get('session:key');

    var io = require('socket.io').listen(server);

    var disconnectRoom = function (name) {
        name = '/' + name;

        var users = io.manager.rooms[name];

        for (var i = 0; i < users.length; i++) {
            io.sockets.socket(users[i]).disconnect();
        }

        return this;
    };

    io.set('origins', 'http://node.test:*');
    io.set('logger', log);

    io.use(function (socket, next) {
        var handshakeData = socket.request;

        async.waterfall([
            function (callback) {
                //получить sid
                var parser = cookieParser(secret);
                parser(handshakeData, {}, function (err) {
                    if (err) return callback(err);

                    var sid = handshakeData.signedCookies[sessionKey];

                    loadSession(sid, callback);
                });
            },
            function (session, callback) {
                if (!session) {
                    return callback(new HttpError(401, "No session"));
                }

                socket.handshake.session = session;
                loadUser(session, callback);
            },
            function (user, callback) {
                if (!user) {
                    return callback(new HttpError(403, "Anonymous session may not connect"));
                }
                callback(null, user);
            }
        ], function (err, user) {

            if (err) {
                if (err instanceof HttpError) {
                    return next(new Error('not authorized'));
                }
                next(err);
            }

            socket.handshake.user = user;
            next();

        });

    });

    io.on('connection', function (socket) {

        var userRoom = "user:room:" + socket.handshake.user.username;
        socket.join(userRoom);

        var username = socket.handshake.user.username;

        socket.broadcast.emit('join', username);

        socket.on('message', function (text, callback) {
            socket.broadcast.emit('message', username, text);
            callback && callback();
        });

        socket.on('disconnect', function () {
            socket.broadcast.emit('leave', username);
        });
    });

    return io;
};
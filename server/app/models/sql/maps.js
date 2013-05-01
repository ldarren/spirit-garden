var
zip = require('pico').zip,
unzip = require('pico').unzip,
client;

const
SELECT_BY_GEOHASHES = 'SELECT * FROM maps WHERE geohash IN (?);',
SELECT_BY_USERID = 'SELECT * FROM maps WHERE userId = ?;',
INSERT = 'INSERT INTO maps SET ?;',
UPDATE = 'INSERT INTO maps SET ? ON DUPLICATE KEY UPDATE ?;';

exports.setup = function(context, next){
    client = context.sqlGame;

    next();
};

exports.insert = function(models, cb){
    var
    map = models[0],
    params = {createdAt: new Date()};

    if (map.userId) params['userId'] = map.userId;
    params['geohash'] = map.geohash;
    zip(map.info, function(err, info){
        if (err) return cb(err);

        params['info'] = info;
        client.query(INSERT, params, cb);
    });
};

exports.update = function(models, cb){
    var
    map = models[0],
    userId = map.userId,
    geohash = map.geohash,
    updateParams = {},
    insertParams = {createdAt: new Date()};

    if (userId) updateParams['userId'] = insertParams['userId'] = userId;
    updateParams['geohash'] = insertParams['geohash'] = geohash;
    zip(map.info, function(err, info){
        if (err) return cb(err);

        updateParams['info'] = insertParams['info'] = info;
        client.query(UPDATE, [insertParams, updateParams], cb);
    });
};

function unzipAllInfos(zippedMaps, unzippedMaps, cb){
    if (!zippedMaps || !zippedMaps.length) return cb(null, unzippedMaps);

    var map = zippedMaps.pop();
    unzip(map.info, function(err, info){
        if (err) return cb(err);
        map.info = info;
        unzippedMaps.push(map);
        unzipAllInfos(zippedMaps, unzippedMaps, cb);
    });
}

exports.selectByGeohashes = function(geohashes, cb){
    client.query(SELECT_BY_GEOHASHES, [geohashes], function(err, maps){
        if (err) return cb(err);

        unzipAllInfos(maps, [], cb);
    });
};

exports.selectByUserId = function(userId, cb){
    client.query(SELECT_BY_USERID, [userId], function(err, maps){
        if (err) return cb(err);

        unzipAllInfos(maps, [], cb);
    });
};

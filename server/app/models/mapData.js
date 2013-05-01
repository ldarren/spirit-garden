const MODEL_ID = G_SESSION.MAPDATA;

var
pico = require('pico'),
sqlMapData = require('./sql/maps'),
redisMapData = require('./redis/mapData');

function saveMaps(model, data, modelInfos){
    var
    infoObj, geohash;

    for(var key in data){
        infoObj = data[key];
        geohash = infoObj.geohash;

        model[geohash] = infoObj;
        modelInfos.push([{modelId:MODEL_ID, key:geohash}]);
    }

    return modelInfos;
}

function readMaps(model, maps, modelInfos){
    var map, geohash;

    for (var i=0,l=maps.length; i<l; i++){
        map = maps[i];
        geohash = map.geohash;
        model[geohash] = map;
        modelInfos.push([{modelId:MODEL_ID, key:geohash}]);
    }
    return modelInfos;
}

function createMapInfo(){
    return {
        terrain: [],
        plants: {}
    };
}

function createMaps(model, geohashes, infos){
    var geohash;

    for(var i=0, l=geohashes.length; i<l; i++){
        geohash = geohashes[i];
        model[geohash] = {
            geohash: geohash,
            info: createMapInfo()
        };
        infos.push([{modelId:MODEL_ID, key:geohash}]);
    }
    return infos;
}

exports.resolveMap = function(models, cb){
    var
    map = models[0],
    user = models[1],
    userId = user.userId,
    geohash = 'u:'+userId.toString();

    map['userId'] = userId;
    map['geohash'] = geohash;

    sqlMapData.selectByUserId(userId, function(err, userMaps){
        if (err) return cb(err);

        var
        userMapGeohashes = [geohash],
        userMap, mapInfo, gh;

        for(var i=0,l=userMaps.length; i<l; i++){
            userMap = userMaps[i];
            gh = userMap.geohash;
            if (gh === geohash) mapInfo = userMap.info;
            userMapGeohashes.push(userMaps[i].geohash);
        }
        user['maps']=userMapGeohashes;

        if (mapInfo){
            map['info'] = mapInfo;
            cb();
        }else{
            sqlMapData.insert(models, cb);
        }
    });
};

exports.createUserMap = function(session, order, next){
    var
    data = order.data,
    model = session.getModel(MODEL_ID),
    geohash = data.geohash,
    userId = data.userId;

    model['me'] = {
        geohash: '',
        userId: 0,
        info: createMapInfo()
    };

    session.addJob(
        G_CCONST.CREATE,
        order.api,
        order.reqId,
        exports,
        exports.resolveMap,
        G_PICO_WEB.RENDER_FULL,
        [[{modelId:MODEL_ID, key:'me'},{modelId:G_SESSION.USERDATA, key:userId}]]
    );

    next();
};

exports.save = function(session, order, next){
    var
    data = order.data,
    model = session.getModel(MODEL_ID),
    modelInfos = saveMaps(model, data, []);

    session.addJob(
        G_CCONST.UPDATE,
        order.api,
        order.reqId,
        sqlMapData,
        sqlMapData.update,
        G_PICO_WEB.RENDER_HEADER,
        modelInfos
    );

    next();
};

exports.read = function(session, order, next){
    var
    model = session.getModel(MODEL_ID),
    data = order.data,
    geohashes = [];

    for (var key in data){
        geohashes.push(data[key].geohash);
    }

    sqlMapData.selectByGeohashes(geohashes, function(err, maps){
        if (err) return next(err);

        var infos = [];

        if (!maps || !maps.length || geohashes.length !== maps.length){
            createMaps(model, geohashes, infos); // readMaps will override with correct infos
        }

        var modelInfos = readMaps(model, maps, infos);

        session.addJob(
            G_CCONST.READ,
            order.api,
            order.reqId,
            undefined,
            undefined,
            G_PICO_WEB.RENDER_FULL,
            modelInfos
        );

        next();
    });
};

exports.readUserMaps = function(session, order, next){
    var
    model = session.getModel(MODEL_ID),
    userData = session.getModel(G_SESSION.USERDATA),
    data = order.data,
    userId = data.userId,
    user = userData[userId],
    userMaps = [];

    sqlMapData.selectByUserId(userId, function(err, maps){
        if (err) return next(err);

        for(var i=0,l=maps.length; i<l; i++){
            userMaps.push(maps[i].geohash);
        }
        user['maps']=userMaps;

        var modelInfos = readMaps(model, maps, []);

        session.addJob(
            G_CCONST.READ,
            order.api,
            order.reqId,
            undefined,
            undefined,
            G_PICO_WEB.RENDER_FULL,
            modelInfos
        );

        next();
    });
};

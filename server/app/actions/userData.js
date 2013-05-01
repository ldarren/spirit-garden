var
userData = require('../models/userData'),
mapData = require('../models/mapData');

exports.setup = function(context, next){
    var web = context.webServer;

    web.route(G_API.USERDATA_READ, [userData.read, mapData.readUserMaps]);
    web.route(G_API.USERDATA_CREATE, [userData.create, mapData.createUserMap]);
    next();
};

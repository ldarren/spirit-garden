var mapData = require('../models/mapData');

exports.setup = function(context, next){
    var web = context.webServer;

    web.route(G_API.MAPDATA_READ, [mapData.read]);
    web.route(G_API.MAPDATA_SAVE, [mapData.save]);
    next();
};

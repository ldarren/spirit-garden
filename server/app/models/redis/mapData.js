var
client;

exports.setup = function(context, next){
    client = context.redisMapData;

    next();
};

exports.save = function(key, data, cb){
    client.set(key, data, cb);
};

exports.read = function(key, cb){
    client.get(key, cb);
};

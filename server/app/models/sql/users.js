var
client;

const
SELECT_BY_UUID = 'SELECT * FROM users WHERE uuid=?;',
SELECT_BY_USERID = 'SELECT * FROM users WHERE userId=?;',
INSERT = 'INSERT INTO users SET ?;';

exports.setup = function(context, next){
    client = context.sqlUsers;

    next();
};

exports.insert = function(models, cb){
    var
    user = models[0],
    params = {createdAt: new Date()};

    params['userId'] = user.userId;
    params['device'] = user.device;
    params['uuid'] = user.uuid;

    client.query(INSERT, params, cb);
};

exports.selectByUUID = function(params, cb){
    client.query(SELECT_BY_UUID, params, cb);
};

exports.selectByUserId = function(params, cb){
    client.query(SELECT_BY_USERID, params, cb);
};

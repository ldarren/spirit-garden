const
MODEL_ID = G_SESSION.USERDATA;

var
//redisUsers = require('./redis/users'),
sqlUsers = require('./sql/users');

exports.create = function(session, order, next){
    var
    model = session.getModel(MODEL_ID),
    data = order.data,
    device = data.device,
    uuid = data.uuid;

    sqlUsers.selectByUUID([uuid], function(err, users){
        if (err) return next(err);
        if (users.length){
            var
            user = users[0],
            userId = user.userId;

            data.userId = userId // later operation may need this

            model[userId] = user;

            session.addJob(
                G_CCONST.READ,
                order.api,
                order.reqId,
                undefined,
                undefined,
                G_PICO_WEB.RENDER_FULL,
                [[{modelId:MODEL_ID, key:userId}]]
            );

            next();
        }else{
            model['me'] = {
                device: device,
                uuid: uuid
            };

            data.userId = 'me';

            session.addJob(
                G_CCONST.CREATE,
                order.api,
                order.reqId,
                sqlUsers,
                sqlUsers.insert,
                G_PICO_WEB.RENDER_FULL,
                [[{modelId:MODEL_ID, key:'me'}]],
                ['userId']
            );

            next();
        }
    });
};

exports.read = function(session, order, next){
    var
    model = session.getModel(MODEL_ID),
    userId= order.data.userId;

    sqlUsers.selectByUserId([userId], function(err, users){
        if (err) return next(err);
        if (!users.length) return next('not found');

        var user = users[0];
        model[user.userId] = user;

        session.addJob(
            G_CCONST.READ,
            order.api,
            order.reqId,
            undefined,
            undefined,
            G_PICO_WEB.RENDER_FULL,
            [[{modelId:MODEL_ID, key:user.userId}]]
        );

        next();
    });
};

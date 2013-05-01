pico.def('userData', 'piDataModel', function(){

    var
    me = this,
    myDeviceName,
    myDeviceUUID,
    myself;

    function syncMyself(evt){
        myDeviceUUID = evt.uuid;

        var user = me.getMyself();
        if (user){
            me.request(G_CCONST.READ, {userId: user.userId}); // signin
        }else{
            me.slot(me.UPDATE, me, me.getMyself);
            me.requestOnce(G_CCONST.CREATE, {device:myDeviceName, uuid:myDeviceUUID}); // signup
        }
    }

    this.getMyself = function(){
        if (myself) return myself;
        if (!myDeviceUUID) return;

        var
        users = this.get('all'),
        user;
        for(var i=0,l=users.length; i<l; i++){
            user = users[i];
            if (myDeviceUUID === user.uuid){
                me.unslot(me.UPDATE, this);
                myself = user;
                return user;
            }
        }
        return;
    };

    this.init = function(){
        Object.getPrototypeOf(this).init.call(this,this.moduleName, ['userId']);

        if (window.device){
            myDeviceName = device.name;

            syncMyself({uuid: device.uuid});
        }else{
            myDeviceName = 'browser';
            var dialog = pico.getModule('dialogRegister');
            dialog.slot('dialogRegister.submit', syncMyself);
            pico.changeUIState('register');
        }
    };
});

pico.def('mapData', 'piDataModel', function(){
    this.getMaps = function(geohashes){
        this.request(G_CCONST.READ, geohashes);
    };
    this.updateTerrain = function(geohash, terrain){
        var data = {geohash:geohash, terrain:terrain};

        this.request(G_CCONST.UPDATE, data);
    };
    this.updatePlants = function(geohash, plants){
        var data = {geohash:geohash, plants:plants};

        this.request(G_CCONST.UPDATE, data);
    };
    this.init = function(){
        Object.getPrototypeOf(this).init.call(this, this.moduleName, ['geohash']);
    };
});

pico.def('main', function(){
    this.use('piCanvas');
    this.use('piDataNet');
    this.use('piGeoData');
    this.use('userData');
    this.use('mapData');
    this.use('terrain');
    this.use('ui');

    var
    me = this,
    currWorldView, // true:map view, false:home view
    currGeoHashes,
    currGalleryIndex = 0,
    currMapAnchorMode,
    lastX,lastY,downX,downY,lastLat,lastLng;

    function saveMaps(){
        var myself = me.userData.getMyself();
        if (!myself) return;
        var
        myUserId = myself.userId,
        myMaps = myself.maps,
        maps = me.terrain.getDirtyMaps(),
        update = {},
        map, api, geohash, ownerId;

        if (!maps.length) return;

        for(var i=0,l=maps.length; i<l; i++){
            map = maps[i];
            geohash = map.geohash;
            ownerId = map.ownerId;
            api = {
                geohash: geohash,
                userId: ownerId,
                info: {
                    plants: map.plants,
                    terrain: map.terrain
                }
            };
            // no server userData update needed, it is store on update
            if (myUserId === ownerId){
                if (-1 === myMaps.indexOf(geohash)){
                    myMaps.push(geohash);
                }
            }
            update[geohash] = api;
        }

        me.mapData.request(G_CCONST.UPDATE, update);
    }

    function manageGallery(delta){
        var user = me.userData.getMyself();
        if (user){
            var
            geohashes = user.maps,
            length = geohashes.length;

            currGalleryIndex += delta;
            if (currGalleryIndex + 1 > length) currGalleryIndex = length - 1;
            else if (currGalleryIndex < 0) currGalleryIndex = 0;
            
            var
            ui = me.ui,
            terrain = me.terrain,
            maps = [me.mapData.get({geohash:geohashes[currGalleryIndex]})];

            ui.setGalleryView(geohashes.length, currGalleryIndex);
            terrain.setMaps(false,maps);

            currMapAnchorMode = ui.ANCHOR_HIDE;
            ui.setMapAnchor(currMapAnchorMode);
        }
    }

    function autoMoveMap(){
        if (!lastLat || !lastLng) return;
        var
        c = me.piCanvas,
        currTopLeft = me.terrain.getTopLeft(),
        ctrTop = (c.getStageHeight() - c.getCanvasHeight())/2,
        ctrLeft = (c.getStageWidth() - c.getCanvasWidth())/2,
        topLeft = me.terrain.getTopLeft(),
        boundary = me.piGeoData.getBoundary(lastLat, lastLng),
        WIDTH = G_TILE.COUNT * G_TILE.W,
        HEIGHT = G_TILE.COUNT * G_TILE.H,
        // ctr is at right downward point, longitude right is bigger value but latitude downward is smaller value
        ctrLng = boundary[1] + boundary[3]/2, 
        ctrLat = boundary[0] - boundary[2]/2,
        dTop = Math.floor(HEIGHT * (lastLat - ctrLat)/boundary[2]),
        dLeft = Math.floor(WIDTH * (ctrLng - lastLng)/boundary[3]);
        
        me.piCanvas.pan(ctrLeft - topLeft[1] + dLeft, ctrTop - topLeft[0] + dTop);
    }

    this.onFingerMove = function(evt, x, y){
        if (this.ui.onFingerMove(evt, x, y)) return;
        this.piCanvas.pan(x-lastX, y-lastY);
        lastX = x;
        lastY = y;
        
        var ui = me.ui;
        if (ui.ANCHOR_ON === currMapAnchorMode){
            currMapAnchorMode = ui.ANCHOR_OFF;
            ui.setMapAnchor(currMapAnchorMode);
        }
    };

    this.onFingerDown = function(evt, x, y){
        if (this.ui.onFingerDown(evt, x, y)) return;
        downX = lastX = x;
        downY = lastY = y;
    };

    this.onFingerUp = function(evt, x, y){
        if (Math.abs(x - downX) > 20 || Math.abs(y - downY) > 20) return; // dragged
        if (this.ui.onFingerUp(evt, x, y)) return;
        this.terrain.onFingerUp(evt, x, y);
    };

    this.onMapDataUpdate = function(method, newData){
        if (!currGeoHashes) return;
        var c = me.piCanvas;
        // center map
        c.setTopLeft(Math.floor((c.getStageWidth() - c.getCanvasWidth())/2), Math.floor((c.getStageHeight() - c.getCanvasHeight())/2));

        saveMaps();

        if (currWorldView){
            var
            maps = [],
            ui = me.ui,
            terrain = me.terrain,
            mapData = me.mapData,
            map,row,
            j,k;
            for (var i=0,l=currGeoHashes.length; i<l; i++){
                map = [];
                row = currGeoHashes[i];
                for (j=0,k=row.length; j<k; j++){
                    map = map.concat(mapData.get({geohash:row[j]}));
                }
                if (!map.length || !map[0]) return; // maps contain undefined object
                maps.push(map);
            }
            ui.setGalleryView(0,0);
            me.terrain.setMaps(true,maps);

            currMapAnchorMode = ui.ANCHOR_ON;
            ui.setMapAnchor(currMapAnchorMode);

            autoMoveMap();
        }else{
            manageGallery(0);
        }
    };

    this.onUserDataUpdate = function(){
        var user = me.userData.getMyself();
        if (user){
            var
            mapData = me.mapData,
            maps,
            obj= {},
            hasNew = false,
            geohash,
            geohashes = user.maps;

            currGeoHashes = [geohashes];

            for(var i=0,l=geohashes.length; i<l; i++){
                geohash = geohashes[i];
                maps = mapData.get({geohash:geohash});
                if (!maps || !maps.length){
                    obj[geohash] = {geohash:geohash};
                    hasNew = true;
                }
            }
            if (hasNew) mapData.getMaps(obj);
            this.onMapDataUpdate();
        }
    };

    function onGeoDataUpdate(err, geohashes, lat, lng){
        if (err) return alert(JSON.stringify(err));

        lastLat = lat;
        lastLng = lng;

        var ui = me.ui;
        // if not world view or in anchor on mode, ignore gps update
        if (!currWorldView || ui.ANCHOR_ON !== currMapAnchorMode) return;


        // stream new map
        if (!currGeoHashes || currGeoHashes[0][0] !== geohashes[0][0]){

            currGeoHashes = geohashes;

            var
            obj={},
            geohash,row,j,k;

            for(var i=0,l=geohashes.length; i<l; i++){
                row = geohashes[i];
                for(j=0,k=row.length; j<k; j++){
                    geohash = row[j];
                    obj[geohash] = {geohash:geohash};
                }
            }
            me.mapData.getMaps(obj);
        }
    }

    this.onChangeUI = function(uiName){
        var ui = me.ui;
        switch(uiName){
            case 'home':
            case 'world':
                var worldView = ui.isWorldView();
                if (currWorldView !== worldView){
                    currGeoHashes = undefined;
                    currWorldView = worldView
                    if (worldView){
                        me.piGeoData.startWatch(1, onGeoDataUpdate);
                        me.piGeoData.get(1, onGeoDataUpdate); // startWatch may not work if zero movement
                        currMapAnchorMode = ui.ANCHOR_ON;
                    }else{
                        me.piGeoData.stopWatch();
                        me.onUserDataUpdate();
                        currMapAnchorMode = ui.ANCHOR_HIDE;
                    }
                    ui.setMapAnchor(currMapAnchorMode);
                }
                break;
            case 'left':
                manageGallery(-1);
                break;
            case 'right':
                manageGallery(1);
                break;
            case 'anchor':
                currMapAnchorMode = ui.ANCHOR_OFF;
                if (currWorldView) ui.setMapAnchor(currMapAnchorMode);
                break;
            case 'unanchor':
                currMapAnchorMode = ui.ANCHOR_ON;
                if (currWorldView) ui.setMapAnchor(currMapAnchorMode);
                autoMoveMap();
                break;
        }
    };

    this.onLoad = function(){
        pico.changeUIState('home');
        currMapAnchorMode = me.ui.ANCHOR_ON;

        var
        canvasWidth = 3*G_TILE.COUNT*G_TILE.W,
        canvasHeight = 3*G_TILE.COUNT*G_TILE.H,
        stage = document.querySelector('div#stage'),
        height = window.innerHeight || document.body.clientHeight,
        c = this.piCanvas;

        stage.style.height = height + 'px';
        c.init('div#stage', canvasWidth, canvasHeight);

        this.piDataNet.init({
            pushURL: 'http://107.20.154.29:4888/push',
            pullURL: 'http://107.20.154.29:4888/pull',
            beatRate: 6000
        });
        pico.embed(document.querySelector('div#page'), '../html/views/dialogs.html', function(){
            me.userData.init();
            me.mapData.init();
            me.terrain.init(function(){

                c.slot(c.FINGER_MOVE, me, me.onFingerMove);
                c.slot(c.FINGER_DOWN, me, me.onFingerDown);
                c.slot(c.FINGER_UP, me, me.onFingerUp);

                me.ui.init();
                me.ui.slot('ui.clicked', me, me.onChangeUI);

                me.mapData.slot(me.mapData.UPDATE, me, me.onMapDataUpdate);
                me.userData.slot(me.userData.UPDATE, me, me.onUserDataUpdate);
            });
        });
    };
    this.onPageChanged = function(page, userData){};

    this.slot('load', this, this.onLoad);
});

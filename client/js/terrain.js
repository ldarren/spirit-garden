pico.def('terrain', function(){

    this.use('piCanvas');
    this.use('piAtlas');
    this.use('plants');
    this.use('userData');

    var
    TW = G_TILE.W, TH = G_TILE.H, COUNT = G_TILE.COUNT, W = TW * COUNT, H = TH * COUNT,
    me = this,
    maps,
    layerTerrain,
    atlasPlowedSoil;

    function getEdge(terrain, edge, xCtr, yCtr){
        var row, col, key;
        for(var y=yCtr-1, yl=yCtr+2; y<yl; y++){
            row = terrain[y];
            if (!row) continue;
            for(var x=xCtr-1, xl=xCtr+2; x<xl; x++){
                col = row[x];
                if (!col) continue;
                if (1 === col) {
                    key = y.toString()+':'+x.toString();
                    edge[key] = (edge[key] || 0) + 1;
                }
            }
        }
    }

    function render(){
        var
        ctx = layerTerrain.getContext(),
        j,k,
        map,r,tlX,tlY,terrain, // top left X and Y
        grassEdge = {},
        y,x,yl,xl,row,col,tile,row1,col1,
        xyArr, key;

        layerTerrain.clear();

        for(var i=0,l=maps.length; i<l; i++){
            r = maps[i];
            tlY = i * H;
            for(j=0,k=r.length; j<k; j++){
                map = r[j];
                terrain = map.terrain;
                tlX = j * W;

                yl = terrain.length;
                xl = terrain[0].length;
                grassEdge = {};

                for(y=0; y<yl; y++){
                    row = terrain[y];
                    for (x=0; x<xl; x++){
                        switch(row[x]){
                            case 1:
                                tile = '';
                                break;
                            case 2:
                                tile = '777727777';
                                getEdge(terrain, grassEdge, x, y);
                                break;
                            case 4:
                                if (row[x-1] === 2) tile = '777244777';
                                else if (row[x+1] === 2) tile = '777442777';
                                else tile = '777545777';
                                getEdge(terrain, grassEdge, x, y);
                                break;
                        }
                        if (tile) atlasPlowedSoil.drawImage(ctx, tile, tlX+(TW*x), tlY+(TH*y), TW, TH);
                    }
                }

                for (key in grassEdge){
                    yxArr = key.split(':');
                    y = parseInt(yxArr[0]);
                    x = parseInt(yxArr[1]);
                    switch(grassEdge[key]){
                        case 1:
                            row = terrain[y-1];
                            if (row){
                                col = row[x-1];
                                if (col && 1 !== col){ tile = '617117777'; break; }
                                col = row[x+1];
                                if (col && 1 !== col){ tile = '716711777'; break; }
                            }
                            row = terrain[y+1];
                            if (row){
                                col = row[x-1];
                                if (col && 1 !== col){ tile = '777117617'; break; }
                                col = row[x+1];
                                if (col && 1 !== col){ tile = '777711716'; break; }
                            }
                            // through, 1 soil edge can be straight grass also
                        case 2:
                        case 3:
                            row = terrain[y-1];
                            if (row){
                                col = row[x];
                                if (col && 1 !== col){ tile = '666111777'; break; }
                            }
                            row = terrain[y];
                            if (row){
                                col = row[x-1];
                                if (col && 1 !== col){ tile = '617617617'; break; }
                                col = row[x+1];
                                if (col && 1 !== col){ tile = '716716716'; break; }
                            }
                            row = terrain[y+1];
                            if (row){
                                col = row[x];
                                if (col && 1 !== col){ tile = '777111666'; break; }
                            }
                            break;
                        case 4:
                        case 5:
                            row1 = terrain[y];
                            row = terrain[y-1];
                            if (row){
                                col = row[x];
                                if (col && 1 !== col){
                                    col1 = row1[x-1];
                                    if (col1 && 1 !== col1){ tile = '777646771'; break; }
                                    col1 = row1[x+1];
                                    if (col1 && 1 !== col1){ tile = '777646177'; break; }
                                }
                            }
                            row = terrain[y+1];
                            if (row){
                                col = row[x];
                                if (col && 1 !== col){
                                    col1 = row1[x-1];
                                    if (col1 && 1 !== col1){ tile = '771646777'; break; }
                                    col1 = row1[x+1];
                                    if (col1 && 1 !== col1){ tile = '177646777'; break; }
                                }
                            }
                            break;
                    }
                    atlasPlowedSoil.drawImage(ctx, tile, tlX+(TW*x), tlY+(TH*y), TW, TH);
                }
            }
        }
    }
    
    function validateTerrain(terrain){
        if (!terrain.length){
            for(var i=0, l=G_TILE.COUNT; i<l; i++){
                terrain.push([1,1,1,1,1,1,1,1,1,1]);
            }
        }
        return terrain;
    }

    function info2Map(svrObj, map, def){
        var info = svrObj.info;
        map.geohash = svrObj.geohash;
        map.terrain = validateTerrain(info.terrain || def.terrain);
        map.plants = info.plants || def.plants;
        map.ownerId = svrObj.userId;
        map.dirty = false;
        return map;
    }

    this.onFingerUp = function(evt, x, y){
        if (!layerTerrain || !maps) return;

        var
        realY = y-layerTerrain.offsetTop,
        realX = x-layerTerrain.offsetLeft,
        mi = Math.floor(realY / H),
        mj = Math.floor(realX / W),
        map = maps[mi][mj],
        rowY = Math.floor((realY-(mi*H))/TH),
        colX = Math.floor((realX-(mj*W))/TW),
        terrain = map.terrain;

        if (!map.geohash) return; // not a valid map

        switch(terrain[rowY][colX]){
            case 1: // buy
                var myself = this.userData.getMyself();
                map.ownerId = myself.userId;
                for (var i=0; i<COUNT; i++){
                    for(var j=0; j<COUNT; j++){
                        terrain[i][j] = 2;
                    }
                }
                break;
            case 2: // plow
                terrain[rowY][colX] = 4;
                break;
            case 4: // plant 
                if (this.plants.EMPTY === this.plants.doWork(mi, mj, colX, rowY)){
                    terrain[rowY][colX] = 2;
                }else{
                    return; // no terrain update
                }
                break;
            default:
                return;
        }

        map.dirty = true;
        render();
    };

    this.setMaps = function(isMapView, mapArr){
        var
        c = me.piCanvas,
        map,
        i,l,j,k,
        m1,n1,m2,n2;

        if (isMapView){
            layerTerrain.setPanLimits(0, c.getStageWidth()-c.getCanvasWidth(), 0, c.getStageHeight()-c.getCanvasHeight());
        }else{ // gallery view
            var
            cx = Math.floor((c.getStageWidth()-c.getCanvasWidth())/2),
            cy = Math.floor((c.getStageHeight()-c.getCanvasHeight())/2);

            layerTerrain.setPanLimits(cx, cx, cy, cy);
        }
        maps = [];

        for(i=0,l=3; i<l; i++){
            map = [];
            for(j=0,k=3; j<k; j++){
                map.push({
                    geohash:'',
                    terrain: validateTerrain([]),
                    plants:{},
                    ownerId: 0,
                    dirty: false
                });
            }
            maps.push(map);
        }

        if (3 === mapArr.length && 3 === mapArr[0].length){
            for(i=0,l=mapArr.length; i<l; i++){
                n1 = mapArr[i];
                m1 = maps[i];
                for(j=0,k=m1.length; j<k; j++){
                    n2 = n1[j];
                    m2 = m1[j];
                    info2Map(n2, m2, m2);
                }
            }
        }else{
            map = maps[1][1];
            m2 = mapArr[0][0];
            info2Map(m2, map, map);
        }
        
        render();
        this.plants.setMaps(isMapView, maps);
    };

    this.getDirtyMaps = function(){
        var
        ret = [],
        i,l,j,k,row,map;

        if (!maps) return ret;

        for(i=0,l=maps.length; i<l; i++){
            row = maps[i];
            for(j=0,k=row.length; j<k; j++){
                map = row[j];
                if (map.dirty){
                    map.dirty = false;
                    ret.push(map);
                }
            }
        }
        return ret;
    };

    this.getTopLeft = function(){
        return [layerTerrain.offsetTop, layerTerrain.offsetLeft];
    };

    this.init = function(cb){
        var
        c = this.piCanvas,
        a = this.piAtlas;
        
        a.create('../img/plowed_soil.png', '../img/plowed_soil.json', function(err, plowedSoil){
            atlasPlowedSoil = plowedSoil;

            me.plants.init(function(){

                var
                cx = Math.floor((c.getStageWidth()-c.getCanvasWidth())/2),
                cy = Math.floor((c.getStageHeight()-c.getCanvasHeight())/2);

                layerTerrain = c.addLayer('front');
                layerTerrain.setPanLimits(cx, cx, cy, cy);

                if (cb) cb();
            });
        });
    };
});

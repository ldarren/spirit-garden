/*
 * Plant state
 * 1) empty
 * 2) growing (1-3)
 * 3) ripe (4)
 * 4) harvested (5)
 */
pico.def('plants', function(){
    this.use('piCanvas');
    this.use('piAtlas');

    Object.defineProperty(this, 'EMPTY', {value:0, writable:false, configurable:false, enumerable:true});
    Object.defineProperty(this, 'GROWING1', {value:1, writable:false, configurable:false, enumerable:true});
    Object.defineProperty(this, 'GROWING2', {value:2, writable:false, configurable:false, enumerable:true});
    Object.defineProperty(this, 'GROWING3', {value:3, writable:false, configurable:false, enumerable:true});
    Object.defineProperty(this, 'RIPED', {value:4, writable:false, configurable:false, enumerable:true});
    Object.defineProperty(this, 'HARVESTED', {value:5, writable:false, configurable:false, enumerable:true});

    var
    me = this,
    maps = {},
    cropInfo,
    atlasPlants,
    layerPlants,
    MIN = 60 * 1000,
    TW = G_TILE.W,
    TH = G_TILE.H,
    W = TW * G_TILE.COUNT,
    H = TH * G_TILE.COUNT;

    function getMap(x, y){
        return maps[Math.floor(y/H)][Math.floor(x/W)];
    }
    
    function getIndex(x, y){
        var
        realY = y % H,
        realX = x % W;
        return realY.toString()+':'+realX.toString();
    }

    function dirtyIndex(mapCol, mapRow){
        maps[mapCol][mapRow].dirty = true;
    }

    function createIndex(mapCol, mapRow, x, y){
        var
        map = maps[mapCol][mapRow], 
        keys = Object.keys(cropInfo),
        randType = Math.floor(Math.random() * keys.length),
        crop = {
            name: keys[randType],
            x: x,
            y: y,
            bday: Math.floor(Date.now()/MIN),
            disp: me.EMPTY,
            stat: me.GROWING1
        };

        map.dirty = true;
        map.plants[getIndex(x, y)] = crop;

        return crop;
    }

    function removeIndex(mapCol, mapRow, crop){
        var map = maps[mapCol][mapRow];
        map.dirty = true;
        delete map.plants[getIndex(crop.x, crop.y)];
    }

    function getCrop(mapCol, mapRow, x, y){
        return maps[mapCol][mapRow].plants[getIndex(x, y)];
    }

    this.onUpdate = function(layers, elapsed){
        var
        ctx = layerPlants.getContext(),
        crop,
        info,
        GROWING1 = this.GROWING1,
        GROWING2 = this.GROWING2,
        GROWING3 = this.GROWING3,
        RIPED = this.RIPED,
        EMPTY = this.EMPTY,
        unchanged = true,
        now = Math.floor(Date.now() / MIN),
        H2 = Math.floor(TH/2),
        i,l,j,k,m,n,key,keys,row,map,plants,dim,name;

        for(i=0,l=maps.length; i<l; i++){
            row = maps[i];
            for(j=0,k=row.length;j<k;j++){
                map = row[j];
                plants = map.plants;

                for (key in plants){
                    crop = plants[key];
                    if (crop.disp !== crop.stat) {
                        unchanged = false;
                        continue;
                    }
                    info = cropInfo[crop.name];
                    if (RIPED > crop.stat){
                        state = Math.floor(((now - crop.bday) / info.period) * 4);
                        if (state < GROWING1) state = GROWING1;
                        if (state > RIPED) state = RIPED;
                        if (state != crop.stat){
                            crop.stat = state;
                            unchanged = false;
                        }
                    }
                }
            }
        }

        if (unchanged) return;
        layerPlants.clear();

        for(i=0,l=maps.length; i<l; i++){
            row = maps[i];
            for(j=0,k=row.length;j<k;j++){
                map = row[j];
                plants = map.plants;
                keys = Object.keys(plants);
                keys.sort();
                for (m=0,n=keys.length; m<n; m++){
                    crop = plants[keys[m]];
                    if (EMPTY === crop.stat){
                        removeIndex(i, j, crop);
                        continue;
                    }
                    name = crop.name + crop.stat;
                    dim = atlasPlants.getDimension(name);
                    atlasPlants.drawImage(ctx, name, (j*W) + (TW*crop.x), (i*H) + ((TH*crop.y)) - dim.h - H2, dim.w * 2, dim.h * 2);
                    crop.disp = crop.stat;
                }
            }
        }
    };

    this.setMaps = function(isMapView, mapArr){
        var c = me.piCanvas;

        if (isMapView){
            layerPlants.setPanLimits(0, c.getStageWidth()-c.getCanvasWidth(), 0, c.getStageHeight()-c.getCanvasHeight());
        }else{ // gallery view
            var
            cx = Math.floor((c.getStageWidth()-c.getCanvasWidth())/2),
            cy = Math.floor((c.getStageHeight()-c.getCanvasHeight())/2);

            layerPlants.setPanLimits(cx, cx, cy, cy);
        }
        maps = mapArr;

        var i,l,j,k,key,map,row,plants;

        for(i=0,l=maps.length; i<l; i++){
            row = maps[i];
            for(j=0,k=row.length;j<k;j++){
                map = row[j];
                plants = map.plants;

                for (key in plants){
                    plants[key].disp = me.EMPTY;
                }
            }
        }
        layerPlants.clear();
    };

    this.doWork = function(mapCol, mapRow, x, y){
        var crop = getCrop(mapCol, mapRow, x, y);
        var newStat = this.EMPTY;

        if (!crop || this.EMPTY == crop.stat){
            crop = createIndex(mapCol, mapRow, x, y);
            return crop.stat;
        }else{
            switch(crop.stat){
                case 0: // empty (handled)
                    return this.EMPTY;
                case 1:
                case 2:
                case 3: // growing
                    return crop.stat;
                case 4: // riped
                    newStat = crop.stat = this.HARVESTED;
                    break;
                case 5: // harvested
                    newStat = crop.stat = this.EMPTY;
                    break;
                default:
                    return this.EMPTY;
            }
        }
        dirtyIndex(mapCol, mapRow);
        return newStat;
    };

    this.init = function(cb){
        me.piAtlas.create('../img/plants.png', '../img/plants.json', function(err, plants){
            atlasPlants = plants;

            pico.ajax('get', '../img/plantInfo.json', null, {}, function(err, xhr){
                if (err) return console.error(err);
                if (4 === xhr.readyState){
                    try{
                        cropInfo = JSON.parse(xhr.responseText);
                    }catch(ex){
                        return console.error('plantInfo.json', ex);
                    }

                    var
                    c = me.piCanvas,
                    cx = Math.floor((c.getStageWidth()-c.getCanvasWidth())/2),
                    cy = Math.floor((c.getStageHeight()-c.getCanvasHeight())/2);

                    layerPlants = c.addLayer('plants', 1000);
                    layerPlants.setPanLimits(cx, cx, cy, cy);
                    c.slot(c.UPDATE, me, me.onUpdate);

                    if (cb) cb();
                }
            });
        });
    };
});

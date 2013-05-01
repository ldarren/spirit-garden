pico.def('ui', function(){
    this.use('piCanvas');
    this.use('piAtlas');

    Object.defineProperty(this, 'ANCHOR_HIDE', {value:0, writable:false, configurable:false, enumerable:true});
    Object.defineProperty(this, 'ANCHOR_ON', {value:1, writable:false, configurable:false, enumerable:true});
    Object.defineProperty(this, 'ANCHOR_OFF', {value:2, writable:false, configurable:false, enumerable:true});

    var
    me = this,
    isWorldView = false,
    layoutHome = [
        {name:'home', right:68, top:4, w:64, h:64},
        {name:'market', left:4, bottom:68, w:64, h:64},
        {name:'inventory', left:72, bottom:68, w:64, h:64},
        {name:'setting', left:140, bottom:68, w:64, h:64},
    ],
    layoutDynamics = [
        {name:'left', left:4, vcenter:0, w:64, h:64},
        {name:'right', right:68, vcenter:0, w:64, h:64},
        {name:'anchor', left:4, top:0, w:64, h:64},
        {name:'unanchor', left:4, top:0, w:64, h:64},
    ],
    layoutWorld = [
        {name:'world', right:68, top:4, w:64, h:64},
        {name:'market', left:4, bottom:68, w:64, h:64},
        {name:'inventory', left:72, bottom:68, w:64, h:64},
        {name:'setting', left:140, bottom:68, w:64, h:64},
    ],
    layout = isWorldView ? layoutWorld : layoutHome,
    layoutExt = [],
    atlasUI64,
    layerUI,
    setPositions = function(components){
        var
        item,
        c = me.piCanvas,
        w = c.getStageWidth(),
        h = c.getStageHeight(),
        w2 = Math.floor(w/2),
        h2 = Math.floor(h/2);

        for(var i=0,l=components.length; i<l; i++){
            item = components[i];
            if (undefined !== item.right) item.x = w - item.right;
            else if (undefined !== item.hcenter) item.x = w2 + item.hcenter;
            else item.x = item.left || 0;

            if (undefined !== item.bottom) item.y = h - item.bottom;
            else if (undefined !== item.vcenter) item.y = h2 + item.vcenter;
            else item.y = item.top || 0;
        }
    },
    render = function(){
        var
        item,i,l,
        c = me.piCanvas,
        ctx = layerUI.getContext();

        setPositions(layout);
        setPositions(layoutExt);

        layerUI.clear();

        for(i=0,l=layout.length; i<l; i++){
            item = layout[i];
            atlasUI64.drawImage(ctx, item.name, item.x, item.y);
        }
        for(i=0,l=layoutExt.length; i<l; i++){
            item = layoutExt[i];
            atlasUI64.drawImage(ctx, item.name, item.x, item.y);
        }
    };

    this.isWorldView = function() { return isWorldView; };

    this.setGalleryView = function(total, curr){
        layoutExt = [];
        if (total < 2) return render();
        if (curr > 0) layoutExt.push(layoutDynamics[0]);
        if (curr+1 < total) layoutExt.push(layoutDynamics[1]);
        render();
    };

    this.setMapAnchor = function(mode){
        var
        name,
        unanchor = 'unanchor', anchor = 'anchor';
        for (var i=0,l=layoutExt.length; i<l; i++){
            name = layoutExt[i].name;
            if (unanchor === name || anchor === name){
                layoutExt.splice(i, 1);
                break;
            }
        }
        if (this.ANCHOR_HIDE !== mode){
            layoutExt.push(layoutDynamics[mode === this.ANCHOR_ON ? 2 : 3]);
        }
        render();
    };

    this.onUpdate = function(layers, elapsed){
    };

    this.onFingerDown = function(evt, x, y){
        return false;
    };

    this.onFingerMove = function(evt, x, y){
        return false;
    };

    this.onFingerUp = function(evt, x, y){
        var
        item,
        c = this.piCanvas,
        sx = x - c.getStageLeft(),
        sy = y - c.getStageTop();

        for(var i=0,l=layout.length; i<l; i++){
            item = layout[i];
            if (sx > item.x && sx < item.x + item.w && sy > item.y && sy < item.y + item.h){
                switch(item.name){
                    case 'home':
                        isWorldView = true;
                        layout = layoutWorld;
                        render();
                        break;
                    case 'world':
                        isWorldView = false;
                        layout = layoutHome;
                        render();
                        break;
                    case 'inventory':
                    case 'market':
                    case 'setting':
                        pico.changeUIState('coming');
                        break;
                    default:
                        return false;
                }
                this.signal('ui.clicked',[item.name]);
                return true;
            }
        }
        for(var i=0,l=layoutExt.length; i<l; i++){
            item = layoutExt[i];
            if (sx > item.x && sx < item.x + item.w && sy > item.y && sy < item.y + item.h){
                this.signal('ui.clicked',[item.name]);
                return true;
            }
        }
        return false;
    };

    this.init = function(){
        me.piAtlas.create('../img/64_set.png', '../img/64_set.json', function(err, atlas){
            atlasUI64 = atlas;

            var c = me.piCanvas;
            layerUI = c.addLayer('ui', 2000, c.getStageWidth(), c.getStageHeight());
            c.slot(c.UPDATE, me, me.onUpdate);
            
            render();
        });
    };
});

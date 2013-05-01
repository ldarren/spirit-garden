"use strict"; 

var context;        // canvas context
var logging = true;
var atlas;          // testure atlas image
var logElement;
var xCanvas;        // position of canvas control in page
var yCanvas;
var xMouse = 0;
var yMouse = 0;
var eyeRight = new Eye();
var eyeLeft = new Eye();
var atlasMap = [];      // map of images in texture atlas
var listAnim = [];      // array of animations
var currAnim;   
var lastRender = new Date().getTime();
var canvasWidth;
var canvasHeight;
var standStill;         // default animation
var canvas;

function getCoords(evt) {
    xMouse = evt.clientX;
    yMouse = evt.clientY + window.pageYOffset;
};

// iPhone touch support
function getCoordsTouch(evt) {
    var touch = evt.touches[0];
    if (touch) {
        xMouse = touch.pageX;
        yMouse = touch.pageY + window.pageYOffset;
    }
};


function AtlasImage(){
    this.m_x;
    this.m_y;
    this.m_width;
    this.m_height;
    this.m_xOffset;
    this.m_yOffset;
    this.m_name;
    this.load = function(elem) {
        this.m_x = parseInt(elem.getAttribute("x")); 
        this.m_y = parseInt(elem.getAttribute("y")); 
        this.m_width = parseInt(elem.getAttribute("width"));
        this.m_height = parseInt(elem.getAttribute("height"));
        this.m_name = elem.getAttribute("name");
        // offset is an optional parameter
        if (elem.getAttribute("xOffset")) this.m_xOffset = parseInt(elem.getAttribute("xOffset"));
        else this.m_xOffset = 0;
        if (elem.getAttribute("yOffset")) this.m_yOffset = parseInt(elem.getAttribute("yOffset"));
        else this.m_yOffset = 0;
    };
    this.render = function(x, y) {
        context.drawImage(atlas, this.m_x, this.m_y,
        this.m_width, this.m_height, 
        this.m_xOffset+x, this.m_yOffset+y, 
        this.m_width, this.m_height);  
    };
};

function Animation(){
    this.m_currFrame;
    this.m_age;
    this.m_listFrame = [];
    this.m_moveEyes = true;

    this.isFinished = function() {
        return this.m_age >= this.m_listFrame.length*1000/12;
    };
    this.start = function() {
        this.m_age = 0;
        this.m_currFrame = 0;
    };
    this.init = function(listIndex) {
        this.start();
        var image;
        for (var n = 0; n < listIndex.length; n++) {
            image = atlasMap[listIndex[n]];
            if (image)
            this.m_listFrame.push(image);
            else alert("missing image:"+listIndex[n]);
        }
    };

    this.update = function(timeElapsed) {
        this.m_age += timeElapsed;
        // 12 frames per second
        this.m_currFrame = Math.floor(this.m_age/1000*12);
        if (this.m_currFrame >= this.m_listFrame.length)
        this.m_currFrame = this.m_listFrame.length-1;
        if (this.m_currFrame < 0)
        this.m_currFrame = 0;
    };
    this.render = function() {
        this.m_listFrame[this.m_currFrame].render(0, 0);  
    };
};

function Eye(){
    this.m_x;
    this.m_y;
    // m_xOrig, m_yOrig is center, between min and max pos
    this.m_xOrig;
    this.m_yOrig;
    this.m_xMin;
    this.m_xMax;
    this.m_yMin;
    this.m_yMax;
    this.m_image;
    this.setMax = function(x, y) {
        this.m_xMax = x;
        this.m_yMax = y;
    };
    this.setMin = function(x, y) {
        this.m_xMin = x;
        this.m_yMin = y;
    };
    this.init = function(x, y) {
        this.m_xOrig = (this.m_xMax-this.m_xMin)/2 + this.m_xMin;
        this.m_yOrig = (this.m_yMax-this.m_yMin)/2 + this.m_yMin;
        this.m_x = this.m_xOrig;
        this.m_y = this.m_yOrig;
    };
    this.update = function() {
        var xDiff = xMouse-(xCanvas+this.m_xOrig);
        var yDiff = yMouse-(yCanvas+this.m_yOrig);
        // first calculate x pos
        if (yDiff == 0){
            if (xDiff > 0){
                this.m_x = this.m_xMax;
            }else{
                this.m_x = this.m_xMin;
            }
            this.m_y = this.m_yOrig;
        }else{
            var slope = xDiff/yDiff;
            if (yDiff > 0){
                this.m_x = slope*(this.m_xMax-this.m_xMin) + this.m_xMin;
            }else{
                this.m_x = -slope*(this.m_xMax-this.m_xMin) + this.m_xMin;
            }
        }
        // then calculate y pos
        if (xDiff == 0){
            if (yDiff > 0){
                this.m_y = this.m_yMax;
            }else{
                this.m_y = this.m_yMin;
            }
            this.m_x = this.m_xOrig;
        }else{
            var slope = yDiff/xDiff;
            if (xDiff > 0){
                this.m_y = slope*(this.m_yMax-this.m_yMin) + this.m_yMin;
            }else{
                this.m_y = -slope*(this.m_yMax-this.m_yMin) + this.m_yMin;
            }
        }
        if (this.m_x > this.m_xMax){
            this.m_x = this.m_xMax;
        }else if (this.m_x < this.m_xMin){
            this.m_x = this.m_xMin;
        }
        if (this.m_y > this.m_yMax){
            this.m_y = this.m_yMax;
        }else if (this.m_y < this.m_yMin){
            this.m_y = this.m_yMin;
        }
    };

    this.render = function(){
        // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        // round it to a integer to prevent subpixel positioning
        var x = Math.round(this.m_x);
        var y = Math.round(this.m_y);
        this.m_image.render(x, y);  
    };
};

function xmlHandler() {
    if (this.readyState == 4) {
        if (this.status == 200 || this.status == 0) {
            if (this.responseXML != null){
                // success!
                var x = this.responseXML.getElementsByTagName("image"); 
                if (x == null ) return;
                for (var n = 0; n < x.length; n++){
                    var atlasImage = new AtlasImage();
                    atlasImage.load(x[n]);
                    atlasMap[x[n].getAttribute("name")] = atlasImage;
                }
                // carry out the rest of the initialisation
                init2();
            } else {
                alert("this.responseXML == null");
            }
        } else {
            alert("this.status = " + this.status);
        }
    }
}

function init2(){
    window.addEventListener ("mousemove", getCoords, true);
    // add support for iPhone, etc.
    document.addEventListener("touchstart", getCoordsTouch, true);
    // find position of canvas and store
    xCanvas = canvas.offsetLeft;
    yCanvas = canvas.offsetTop;
    var elem = canvas.offsetParent;
    while (elem){
        xCanvas += elem.offsetLeft;
        yCanvas += elem.offsetTop;
        elem = elem.offsetParent;
    }
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;

    var nellyBase = atlasMap["base"];

    eyeRight.setMin(44+nellyBase.m_xOffset, 30);
    eyeRight.setMax(54+nellyBase.m_xOffset, 52);
    eyeRight.m_image = atlasMap["eye"];
    eyeRight.init();
    eyeLeft.setMin(34+nellyBase.m_xOffset, 30);
    eyeLeft.setMax(39+nellyBase.m_xOffset, 52);
    eyeLeft.m_image = atlasMap["eye"];
    eyeLeft.init();
    var earFlap = new Animation();
    earFlap.init(["earflap02", "earflap04", "earflap06", "earflap08", "earflap06", "earflap04", "earflap02", "base"]);
    earFlap.m_moveEyes = false;
    listAnim.push(earFlap);

    var trunkSwing = new Animation();
    trunkSwing.init(["trunk_swing01", "trunk_swing03", "trunk_swing05", "trunk_swing03", "trunk_swing01", "base", "trunk_swing13", "trunk_swing15", "trunk_swing17", "trunk_swing15", "trunk_swing13", "base"]);
    listAnim.push(trunkSwing);

    var blink = new Animation();
    blink.init(["base", "blink02", "base"]);
    blink.m_moveEyes = false;
    // make him blink more often
    listAnim.push(blink);
    listAnim.push(blink);

    standStill = new Animation();
    standStill.init(["base"]);
    currAnim = standStill;

    requestAnimFrame(render);
}

function init(){
    canvas = document.getElementById('nelly');
    if (canvas.getContext) {
        context = canvas.getContext('2d');
    } else {
        return;
    }
    logElement = document.getElementById('log');
    atlas = new Image();  
    atlas.src = "../img/images0.png";
    atlas.onload = function() { 
        var client = new XMLHttpRequest();
        client.onreadystatechange = xmlHandler;
        client.open("GET", "../img/atlas.xml");
        client.send();
    };
}

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       || 
            window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame    || 
            window.oRequestAnimationFrame      || 
            window.msRequestAnimationFrame     || 
            function( callback ){
                window.setTimeout(callback, 17);
            };
})();

function render() {  
    var timeElapsed = new Date().getTime() - lastRender;
    lastRender = new Date().getTime();
    if (currAnim.isFinished()) {
        var randNum = Math.floor(Math.random()*100);
        if (randNum < listAnim.length) {
            currAnim = listAnim[randNum];
        } else {
            // make it show stand still animation most of the time
            currAnim = standStill;
        }
        currAnim.start();
    }
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    currAnim.update(timeElapsed);
    currAnim.render();  
    if (currAnim.m_moveEyes == true) {
        eyeRight.update();
        eyeLeft.update();
        eyeRight.render();
        eyeLeft.render();
        if (logging && logElement){
            logElement.innerHTML = "xMouse=" + xMouse + " yMouse=" + yMouse;
        }
    }
    requestAnimFrame(render);  
}  

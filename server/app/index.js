var pico = require('pico');

require('../../common/const');

var
path = require('path'),
args = process.argv,
root = args[1],
configBasePath, configPath;

if ('.js' === path.extname(root)) root = path.dirname(root);

for(var i=2,l=args.length; i<l; i++){
    switch(args[i]){
        case '-h':
            console.log('usage help here');
            break;
        case '-c':
            configPath = root + '/' + args[++i],
            configBasePath = path.dirname(configPath) + '/base';
            break;
    }
}
pico.createApp(root, configBasePath, configPath);

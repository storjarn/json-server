var http = require('http');
var postdata = require('post-data');
var fs = require('fs');
var Path = require('path');
var mkdirp = require('mkdirp');

var config = {
    port: 6504, //JSON
    fileBase: './data/',
    contentType: 'application/json'
};

function uhoh(err, res) {
    console.error(err);
    res.writeHead(500, {
        'Content-Type': config.contentType
    });
    res.end(JSON.stringify(err));
}

function fwrite(data, fileName) {
    fs.writeFileSync(fileName, JSON.stringify(data, null, 4));
}

function ok(data, res) {
    res.writeHead(200, {
        'Content-Type': config.contentType
    });
    res.end(JSON.stringify(data));
}

http.createServer(function (req, res) {
    var path = req.url;
    var realPath = Path.join(__dirname, config.fileBase, path);
    var parentPath = Path.dirname(realPath);
    var fileName = realPath + ".json";

    switch (req.method.toLowerCase()) {
        case 'post':
        case 'put':
        case 'patch':
            postdata(req, function (error, data) {
                if (error) {
                    uhoh(error, res);
                } else {
                    mkdirp(parentPath, function (err) {
                        if (err) {
                            uhoh(err, res);
                        } else {
                            fwrite(data, fileName);
                            ok(data, res);
                        }
                    });
                }
            });
            break;
        default:
            ok('Hello World', res);
    }
}).listen(config.port, '127.0.0.1');

console.log('Server running at http://127.0.0.1:' + config.port + '/');

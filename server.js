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
    if (err) {
        console.error(err);
        res.writeHead(500, {
            'Content-Type': config.contentType
        });
        res.end(JSON.stringify(err, null, 4));
    }
}

function fwrite(data, fileName, callback) {
    fs.writeFile(fileName, JSON.stringify(data, null, 4), callback || function(err) {
        console.error(err);
    });
}

function fread(path, callback) {
    fs.readFile(path, {
        encoding: 'utf8'
    }, callback || function (err, data) {
      if (err) {
          console.error(err);
      }
      console.log(data);
    });
}

function ok(data, res) {
    res.writeHead(200, {
        'Content-Type': config.contentType
    });
    res.end(JSON.stringify(data));
}

var middleWare = [

    function (req, res) {
        console.log(req.method.toUpperCase(), ':', req.url);
    },

    function (req, res) {
        res.ok = function(data) {
            ok(data, res);
        };
        res.uhoh = function(err) {
            uhoh(err, res);
        };
    },

    function (req, res) {
        var path = req.url;
        var realPath = Path.join(__dirname, config.fileBase, path);
        var parentPath = Path.dirname(realPath);
        var fileName = realPath + ".json";

        switch (req.method.toLowerCase()) {
            case 'post':
            case 'put':
            case 'patch':
                postdata(req, function (error, data) {
                    res.uhoh(error);
                    mkdirp(parentPath, function (err) {
                        res.uhoh(err);
                        fwrite(data, fileName, function(err) {
                            res.uhoh(err);
                            res.ok(data);
                        });
                    });
                });
                break;
            case 'delete':
                res.uhoh('Not Implemented');
                break;
            default:
                fread(fileName, function(err, data) {
                    res.uhoh(err);
                    res.ok(JSON.parse(data));
                });
        }
    }

];

http.createServer(function (req, res) {
    for(var i = 0; i < middleWare.length; ++i) {
        middleWare[i](req, res);
    }
}).listen(config.port, '127.0.0.1');

console.log('Server running at http://127.0.0.1:' + config.port + '/');

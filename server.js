#!/usr/bin/env node

var http = require('http');
var postdata = require('post-data');
var fs = require('fs');
var Path = require('path');
var mkdirp = require('mkdirp');
var rmdir = require('rmdir');

var config = {
    port: 6504, //JSON
    fileBase: './data/',
    contentType: 'application/json'
};

function uhoh(err, res, code) {
    if (err) {
        code = code || 500;
        console.error(code, err);
        res.writeHead(code, {
            'Content-Type': config.contentType
        });
        res.end(JSON.stringify(err, null, 4));
    }
}

function ok(data, res) {
    res.writeHead(200, {
        'Content-Type': config.contentType
    });
    res.end(JSON.stringify(data));
}

function canFile(path) {
    return Path.resolve(path).indexOf(Path.resolve(config.fileBase)) > -1 /*&& Path.dirname(path) !== Path.resolve(config.fileBase)*/;
}

function fwrite(data, fileName, callback) {
    var willCreate = fileName && canFile(fileName);
    if (willCreate) {
        fs.writeFile(fileName, JSON.stringify(data, null, 4), callback || function (err) {
            if (err) {
                throw err;
            }
        });
    } else {
        callback(new Error('Oops'));
    }

}

function fread(path, callback) {
    var willRead = path && canFile(path);
    if (willRead) {
        fs.readFile(path, {
            encoding: 'utf8'
        }, callback || function (err, data) {
            if (err) {
                throw err;
            }
            console.log(data);
        });
    } else {
        callback(new Error('Oops'));
    }
}

function dread(path, callback) {
    var willRead = path && canFile(path);
    if (willRead) {
        fs.readdir(path, callback || function(err, files) {
            if (err) {
                throw err;
            }
            console.log(files);
        });
    } else {
        callback(new Error('Oops'));
    }
}

function fdelete(path, callback) {
    var willDelete = path && canFile(path);
    if (willDelete) {
        fs.unlink(path, callback || function (err) {
            if (err) {
                throw err;
            } else {
                console.log(path, 'deleted');
            }
        });
    }
}

function ddelete(path, callback) {
    var willDelete = path && canFile(path);
    if (willDelete) {
        rmdir(path, callback || function () {
            console.log(path, 'deleted');
        });
        // fs.rmdir(path, callback || function() {
        //     console.log(path, 'deleted');
        // });
    } else {
        callback();
    }
}

function fexists(path, callback) {
    callback = callback || function (exists) {};
    fs.stat(path, function (err, stat) {
        var exists = false;
        if (err || !stat) {
            exists = false;
        } else {
            exists = stat.isFile();
        }
        callback(exists);
        console.log(path, exists ? 'exists' : "doesn't exist");
    });
}

function dexists(path, callback) {
    callback = callback || function (exists) {};
    fs.stat(path, function (err, stat) {
        var exists = false;
        if (err || !stat) {
            exists = false;
        } else {
            exists = stat.isDirectory();
        }
        callback(exists);
        console.log(path, exists ? 'exists' : "doesn't exist");
    });
}

var middleWare = [

    function (req, res) {
        console.log(req.method.toUpperCase(), ':', req.url);
    },

    function (req, res) {
        //CORS enabled
        if (!res.headersSent) {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers", "X-Requested-With");
        }
    },

    function (req, res) {
        res.ok = function (data) {
            ok(data, res);
        };
        res.uhoh = function (err, code) {
            var status = code;
            if (err) {
                status = code || err.number || err.code;
            }
            uhoh(err, res, status);
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
                    fwrite(data, fileName, function (err) {
                        res.uhoh(err);
                        res.ok(data);
                    });
                });
            });
            break;
        case 'delete':
            // res.uhoh('Not Implemented', 501);

            fexists(fileName, function (exists) {
                if (exists) {
                    fdelete(fileName, function (err) {
                        res.uhoh(err);
                        res.ok({
                            filename: fileName,
                            status: 'Deleted',
                            timestamp: new Date().getTime()
                        });
                    });
                } else {
                    dexists(realPath, function (exists) {
                        if (exists) {
                            ddelete(realPath, function () {
                                res.ok({
                                    filename: realPath,
                                    status: 'Deleted',
                                    timestamp: new Date().getTime()
                                });
                            });
                        } else {
                            res.uhoh('Not Found', 404);
                        }
                    });
                }
            });

            break;
        default:
            fexists(fileName, function (exists) {
                if (exists) {
                    fread(fileName, function (err, data) {
                        res.uhoh(err);
                        res.ok(JSON.parse(data));
                    });
                } else {
                    dexists(realPath, function (exists) {
                        if (exists) {
                            dread(realPath, function (err, files) {
                                res.ok({
                                    directory: Path.normalize(path + '/'),
                                    files: files
                                });
                            });
                        } else {
                            res.uhoh('Not Found', 404);
                        }
                    });
                }
            });
        }
    }

];

http.createServer(function (req, res) {
    try {
        for (var i = 0; i < middleWare.length; ++i) {
            middleWare[i](req, res);
        }
    } catch (ex) {
        res.uhoh(ex);
    }

}).listen(config.port, '127.0.0.1');

console.log('Server running at http://127.0.0.1:' + config.port + '/');

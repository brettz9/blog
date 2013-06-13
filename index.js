/*globals require, __dirname */

var http = require('http'),
    path = require('path'),
    url = require('url'),
    // From https://github.com/kriszyp/promised-io
    //      npm install promised-io
    // Might have also used https://github.com/kriskowal/q/
    fs = require('promised-io/fs'),
    all = require('promised-io/promise').all,
    html = require('./html-boilerplate'),
    atom = require('./atom'),
    config = require('./config'),
    subFolder = 'data';

http.createServer(function (req, res) {
    'use strict';

    var atomObj, contents, htmlObj,
        urlObj = url.parse(req.url, true),
        pathStr = urlObj.path,
        isAtom = urlObj.query.format === 'atom',
        dateType = urlObj.query.dateType === 'updated' ? 'updated' : 'published',
        dateField = dateType === 'updated' ? 'mtime' : 'ctime',
        getExtensionForPath = function (path) {
            var match = path.match(/\.(xml|html|xhtml)/);
            return match ? match[1] : null;
        },
        getContentTypeForFileExtension = function (fileExt) {
            return fileExt === 'xml' ? 'application/xml' : fileExt === 'xhtml' ? 'application/xhtml+xml' : 'text/html';
        },
        getDataPath = function (file) {
            return path.join(__dirname, subFolder, file);
        },
        fileExt = getExtensionForPath(pathStr);

    if (fileExt) {
        fs.readFile(path.join(__dirname, subFolder, pathStr).replace(/%20/g, ' ')).then(function (fileContents) {
            res.writeHead(200, {'Content-Type': getContentTypeForFileExtension(fileExt)});
            res.end(fileContents);
        });
        return;
    }
    fs.readdir(path.join(__dirname, subFolder)).then(function (files) {
        res.writeHead(200, {'Content-Type': isAtom ? 'application/atom+xml' : 'application/xhtml+xml'});
        if (isAtom) {
            
            var promiseGroups = files.reduce(function (arr, file) {
                    return arr.concat(fs.stat(getDataPath(file)), fs.readFile(getDataPath(file)));
                }, []);
            
            all(promiseGroups).then(function (promiseResults) {
                contents = promiseResults.filter(function (promiseResult, i) { // We'll extract the statObj out later
                    return i % 2;
                });
                
                atomObj = config.atomFeed(dateType);

                if (atomObj.entries === undefined) {
                    atomObj.entries = contents.map(function (content, i) {
                            var file = files[i],
                                extension = getExtensionForPath(file),
                                contentType = getContentTypeForFileExtension(extension),
                                statObj = promiseResults[i*2],
                                fileNoExtensionOrParams = file.replace(/\.(xml|html|xhtml).*$/, ''),
                                mtime = statObj.mtime, ctime = statObj.ctime,
                                atomContentType = extension === 'txt' ? 'text' : extension.match(/^x?html$/) ? extension : contentType;
                            return config.atomEntries(file, extension, fileNoExtensionOrParams, contentType, atomContentType, content, mtime, ctime, statObj);
                        }).sort(function (f1, f2) {
                            return f1[dateType] < f2[dateType] ? 1 : -1;
                        });
                }
                if (atomObj.updated === undefined) {
                    atomObj.updated = atomObj.entries[0][dateType];
                }
                res.end(atom(atomObj));
            });
        }
        else {
            all(files.map(function (file) {
                    return fs.stat(getDataPath(file));
                })).then(function (statObjs) {
                    htmlObj = config.htmlFeed(dateType);
                    htmlObj.body = statObjs.map(function (statObj, i) {
                            var file = files[i];
                            return [statObj[dateField], file];
                        }).sort(function (f1, f2) {
                            return f1[0] < f2[0] ? 1 : -1;
                        }).reduce(function (prev, f) {
                            var time = f[0],
                                file = f[1],
                                fileNoExtensionOrParams = file.replace(/\.(xml|html|xhtml).*$/, '');
                            return prev + config.htmlEntries(time, file, fileNoExtensionOrParams);
                        }, '');
                    res.end(html(htmlObj));
                });
        }
    });
}).listen(1338, '127.0.0.1');

console.log('Server running on 127.0.0.1:1338');
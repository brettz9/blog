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
    subFolder = 'data';

http.createServer(function (req, res) {

'use strict';
var atomObj, contents,
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
                
                atomObj = {
                    title: "Brett's main page (Atom)",
                    // base: 'http://brett-zamir.me/',
                    base: 'http://127.0.0.1:1338/',
                    authors: [{name: 'Brett Zamir'}],
                    id: 'http://brett-zamir.me/' + dateType,
                    rights: {
                        type: 'xhtml',
                        content: '<a rel="license" href="http://creativecommons.org/licenses/by/3.0/deed.en_US"><img alt="Creative Commons License" style="border-width:0" src="http://i.creativecommons.org/l/by/3.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/3.0/deed.en_US">Creative Commons Attribution 3.0 Unported License</a>.'
                    },
                    links: [
                        {title: 'Atom feed (by last modified)', rel: 'self', href: 'http://brett-zamir.me/index.js?format=atom&dateType=updated'},
                        {title: 'Atom feed (new posts)', rel: 'alternate', href: 'http://brett-zamir.me/index.js?format=atom&dateType=published'},
                        {title: 'Website', rel: 'alternate', href: 'http://brett-zamir.me/'}
                    ],
                    entries: contents.map(function (content, i) {
                        var file = files[i],
                            extension = getExtensionForPath(file),
                            contentType = getContentTypeForFileExtension(extension),
                            statObj = promiseResults[i*2];

                        return {
                            id: file,
                            updated: statObj.mtime,
                            title: file.replace(/\.(xml|html|xhtml).*$/, ''),
                            published: statObj.ctime,
                            link: {
                                href: file, // For visitable URL (not entry.src)
                                rel: 'alternate',
                                type: contentType
                            },
                            /*
                            // src apparently not supported
                            content: {
                                src: 'http://127.0.0.1:1338/' + file,
                                type: contentType,
                            }
                            */
                            content: {
                                type: extension === 'txt' ? 'text' : extension.match(/^x?html$/) ? extension : contentType, // We use pseudo-MIME-type for text, XHTML, or HTML instead of the real one here when using content instead of a real "src"
                                content: content
                            }
                        };
                    }).sort(function (f1, f2) {
                        return f1[dateType] < f2[dateType] ? 1 : -1;
                    })
                };
                atomObj.updated = atomObj.entries[0][dateType];
                res.end(atom(atomObj));
                
            });
        }
        else {
            all(files.map(function (file) {
                    return fs.stat(getDataPath(file));
                })).then(function (statObjs) {
                    res.end(html({
                        title: "Brett's main page",
                        head:
                            '<link href="index.js?format=atom&amp;dateType=published" rel="alternate" type="application/atom+xml" title="Brett\'s blog (new posts)" />\n' +
                            '<link href="index.js?format=atom&amp;dateType=updated" rel="alternate" type="application/atom+xml" title="Brett\'s blog (recently modified posts)" />\n',
                        body: statObjs.map(function (statObj, i) {
                                var file = files[i];
                                return [statObj[dateField], file];
                            }).sort(function (f1, f2) {
                                return f1[0] < f2[0] ? 1 : -1;
                            }).reduce(function (prev, f) {
                                return prev + '<li><a href="' + f[1] + '">' + f[1].replace(/\.(xml|html|xhtml).*$/, '') + '</a> (' + f[0] + ')</li>\n';
                            }, '<ul>\n') + '</ul>\n'
                    }));
                });
        }
    });

}).listen(1338, '127.0.0.1');

console.log('Server running on 127.0.0.1:1338');
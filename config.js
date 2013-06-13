/*globals require, exports*/

/**
* NOTE: If keeping things simple, you will probably only need to configure the return objects of the "htmlFeed", and "atomFeed" functions (and possibly "htmlEntries")
* @see {@link http://tools.ietf.org/html/rfc4287} for format details
*/
(function () {
'use strict';

// HELPERS
var formatDate = require('./date-helpers').formatDate,
    $x = require('./xml-helpers');

/**
* @param {"published"|"updated"} dateType Whether this feed is being generated to sort by most recently published (created time) or most recently updated (modified time)
* @returns {Object} The object to be used for the output of an HTML feed
*/
function htmlFeed (dateType) {
    return {
        title: "Brett's main page (" + dateType + ")",
        head:
            '<link href="index.js?format=atom&amp;dateType=published" rel="alternate" type="application/atom+xml" title="Brett\'s blog (new posts)" />\n' +
            '<link href="index.js?format=atom&amp;dateType=updated" rel="alternate" type="application/atom+xml" title="Brett\'s blog (recently modified posts)" />\n',
        top: '<h1>' + "Brett's main page (" + dateType + ")" + '</h1>'+
                '<ul>\n',
        bottom: '</ul>'
    };
}

/**
* @param {String|Date} time ISO date string representing published or updated time of the file (depending on type of feed requested)
* @param {String} file The name of the currently iterating file (with extension)
* @param {String} fileNoExtensionOrParams The file with extension and any request parameters stripped off
* @returns {String} The output for a single HTML entry
*/
function htmlEntries (time, file, fileNoExtensionOrParams) {
    return '<li><a href="' + file + '">' + fileNoExtensionOrParams + '</a> (' + time + ')</li>\n';
}


/**
* @param {"published"|"updated"} dateType Whether this feed is being generated to sort by most recently published (created time) or most recently updated (modified time)
* @returns {Object} The object to be used for the output of an Atom feed
*/
function atomFeed (dateType) {
    return {
        // "updated" is required (format: 2003-12-13T18:30:02Z), but the default behavior is to auto-generate this value
        // "entries" should not typically be used here; instead let them be generated via atomEntries

        id: 'http://brett-zamir.me/' + dateType, // REQUIRED (AND MUST BE UNIQUE FOR EACH FEED AND TWO DATE TYPES)
        title: "Brett's main page (Atom)", // REQUIRED
        // base: 'http://brett-zamir.me/',
        base: 'http://127.0.0.1:1338/',
        authors: [{name: 'Brett Zamir'}],
        rights: {
            type: 'xhtml',
            content: '<a rel="license" href="http://creativecommons.org/licenses/by/3.0/deed.en_US"><img alt="Creative Commons License" style="border-width:0" src="http://i.creativecommons.org/l/by/3.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/3.0/deed.en_US">Creative Commons Attribution 3.0 Unported License</a>.'
        },
        links: [
            {title: 'Atom feed (by last modified)', rel: 'self', href: 'http://brett-zamir.me/index.js?format=atom&dateType=updated'},
            {title: 'Atom feed (new posts)', rel: 'alternate', href: 'http://brett-zamir.me/index.js?format=atom&dateType=published'},
            {title: 'Website', rel: 'alternate', href: 'http://brett-zamir.me/'}
        ]
    };
}

/**
* @param {} file The file name of the currently iterating file (with extension)
* @param {String} extension The file extension
* @param {String} fileNoExtensionOrParams The file with extension and any request parameters stripped off
* @param {String} contentType The MIME type of the file
* @param {"text"|"xhtml"|"html"|String} atomContentType The Atom content "type" attribute value (possibly a MIME type)
* @param {String} content The content of the current entry
* @param {String|Date} mtime Entry file modified time
* @param {String|Date} ctime Entry file created time
* @param {Object} statObj The entry file fs.Stats object (also contains the mtime and ctime supplied as separate arguments)
* @returns {Object} The object to be used for output of a single Atom entry
*/
function atomEntries (file, extension, fileNoExtensionOrParams, contentType, atomContentType, content, mtime, ctime, statObj) {
    return {
        id: file, // REQUIRED (AND MUST BE UNIQUE FOR EACH ENTRY)
        updated: mtime, // REQUIRED
        title: fileNoExtensionOrParams, // REQUIRED
         // AN AUTHOR OR AUTHORS WOULD ALSO BE REQUIRED HERE IF NOT PRESENT ON FEED
        published: ctime,
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
            type: atomContentType, // We use pseudo-MIME-type for text, XHTML, or HTML instead of the real one here when using content instead of a real "src"
            content: content
        }
    };
}

exports.htmlFeed = htmlFeed;
exports.htmlEntries = htmlEntries;

exports.atomFeed = atomFeed;
exports.atomEntries = atomEntries;

}());

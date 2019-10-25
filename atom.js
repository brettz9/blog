/*globals require, module */
/**
* Single function export of the module to create an Atom feed. Currently does not support common attributes (xml:base, xml:lang, undefined namespaced attributes) except on the root element (or allowed namespaced element content). A generator and lang are supplied by default unless explicitly given a "false" value. Note the spec does not allow subtitle under entry. Extension elements are not validated including for
the sake of excluding Atom elements.
* @param {Object} details Object with details to populate the Atom feed; properties id, updated, and title are required (and so is authors[0].name if the entries object is not supplied containing authors[0].name for each entry); other properties: base, lang, generator[uri, content, version], authors[].(name|email?|uri?|extensionElements?), subtitle, icon, logo, category/categories, contributor/contributors(name|email?|uri?|extensionElements?), link/links, rights, extensionElements
entries[id, title, updated, src, content (content, src, type), published, authors/author, contributor/contributors, summary, rights, link/links (href, rel, type, hreflang, title, length), category/categories, extensionElements, source[(as entry)]]. Several accept strings instead of objects if no other text or attributes are needed (e.g., if only serving as content).
* @returns {String} The Atom feed as a string
* @see For schema, see Appendix B at {@link http://tools.ietf.org/html/rfc4287#page-35}
*/
var atom = function (details) {
    'use strict';
    var $x = require('./xml-helpers'),
        formatDate = require('./date-helpers').formatDate,
        defaults = {
            lang: 'en',
            generator: {
                uri: 'http://brett-zamir.me/atomGenerator/',
                content: 'Atom Generator',
                version: '1.0'
            }
        },
        rootAttributes, anyEntriesHaveAuthorsWithNames,

        escapeContent = function (holder) {
            return $x.escapeXMLContent(typeof holder === 'object' ? holder.content : holder);
        },
        hasMember = function (parent, member) {
            return parent[member] && (typeof parent[member] === 'string' || parent[member].length);
        },
        textReduction = function (container, level) {
            return function (prev, elem) {
                var stringContainer = container[elem] === 'string' && container[elem];
                return prev + (container[elem] ?
                    (!stringContainer && container[elem].type === 'xhtml' ?
                        $x.element(elem, level, '<div xmlns="http://www.w3.org/1999/xhtml">' + (container[elem].content) + '</div>') :
                        $x.element(elem, level, escapeContent(stringContainer || container[elem]))
                    ) : '');
            };
        },
        undefinedContentElement = function (parent, level, atts, elemName, elemsName) {
            elemsName = elemsName || elemName + 's';
            var elems = parent[elemsName] || (parent[elemName] ? [parent[elemName]] : []);
            return elems.reduce(function (prev, elem) { // We don't escape "elem" as it could be XML
                if (typeof elem === 'string') {
                    var newElem = {};
                    newElem[atts[0]] = elem; // First item in array is required and more likely to be useful as default than content here
                    elem = newElem;
                }
                return prev + $x.element(elemName, level, elem.content, $x.escapeAttributes(atts, elem));
            }, '');
        },
        allOptionalHaveRequiredProperty = function (elems, att, sing, plural) {
            plural = plural || sing + 's'; // Currently not necessary
            return elems.every(function (elem) {
                return (!elem[sing] && !elem[plural]) || // Since optional, if the property doesn't exist, we return true
                    (
                        (elem[sing] && (typeof elem[sing] === 'string' || elem[sing][att])) || // Singular present
                        (elem[plural] && elem[plural].every(function (el) { // Plurals all present
                            return el[att];
                        }))
                    );
            });
        },
        getPersons = function (container, level) {
            return [
                'author',  // ONE OR MORE AUTHORS REQUIRED HERE OR IN EACH ENTRY
                'contributor'
            ].reduce(function (prev, personType) {
                var personsType = personType + 's',
                    persons = container[personsType] || (container[personType] ? [container[personType]] : []);
                return prev + persons.reduce(function (prev, person) {
                    var exts = person.extensionElements, nextLevel = level + 1;
                    return prev +
                        $x.parent(personType, level,
                            [
                                'name', // Required for author if present // Validation above
                                'uri',
                                'email'
                            ].reduce(function (prev, elem) {
                                return prev + $x.escapeElement(person, elem, nextLevel);
                            }, '') +
                            (exts ? ($x.indent(nextLevel) + exts + '\n') : '')
                        );
                }, '');
            }, '');
        },
        /**
        * @returns {String} The XML contents of an Atom <feed> or <source> element
        */
        feedOrSource = function (parentObj, level, isFeed) {
            // CANONICALIZE VARIABLES; E.G., TO CONVERT SINGULAR FORMS INTO PLURAL FOR EASE IN VALIDATION/HANDLING
            // Todo: avoid modifying input object?
            var anyEntriesHaveAuthorsWithNames,
                generator = parentObj.generator || (parentObj.generator !== false && typeof defaults.generator === 'object' && defaults.generator),
                categories = parentObj.categories || (parentObj.category ? [parentObj.category] : []),
                links = parentObj.links || (parentObj.link ? [parentObj.link] : []);
        
            if (parentObj.author) {
                parentObj.authors = [];
                parentObj.authors[0] = {name: parentObj.author};
            }
            if (parentObj.entry) {
                parentObj.entries = [parentObj.entry];
            }

            anyEntriesHaveAuthorsWithNames = !hasMember(parentObj, 'entries') || ( // No entries
                (hasMember(parentObj.entries, 'author') || hasMember(parentObj.entries, 'authors')) && // At least one author exists
                allOptionalHaveRequiredProperty(parentObj.entries, 'name', 'author') // All authors have names
            );

            // VALIDATE REQUIRED FIELDS
            // We don't do full validation here in case it is only a <source> element as id, updated, title, and potential author requirements are only recommended for <source>
            if (isFeed && // <feed>
                !( // If not...
                    (hasMember(parentObj, 'authors') && allOptionalHaveRequiredProperty(parentObj.authors, 'name', 'author')) || // ...authors with names directly on the <feed> OR
                    (hasMember(parentObj, 'entries') && anyEntriesHaveAuthorsWithNames) // ...child entries of this feed with authors and names
                )
            ) {
                throw 'The authors requirement was not met (code: 1).';
            }
            else if (!isFeed && // <source>
                // If there is an authors property, all must have names; if there are entries with authors, these must have names, i.e.,
                //  there are no authors or the ones that exist have names; there are no entries or no authors, or the ones that exist have names
                (!hasMember(parentObj, 'authors') || allOptionalHaveRequiredProperty(parentObj.authors, 'name', 'author')) && // ...ANY authors directly on the <feed> have names OR
                (
                    !hasMember(parentObj, 'entries') ||
                    (!hasMember(parentObj.entries, 'author') && !hasMember(parentObj.entries, 'authors')) ||
                    allOptionalHaveRequiredProperty(parentObj.entries, 'name', 'author')
                )
            ) {
                throw 'The authors requirement was not met (code: 2).';
            }

            if (!allOptionalHaveRequiredProperty(links, 'href', 'link')) {
                throw 'If a link is present, it must contain an "href" attribute';
            }
            if (!allOptionalHaveRequiredProperty(categories, 'term', 'category', 'categories')) {
                throw 'If a category is present, it must contain a "term" attribute';
            }
            
            return [
                'id', // REQUIRED (IRI) // Validation above
                'icon', // IRI: 1:1 ratio
                'logo' // IRI: 2:1 horiz/vertical ratio
            ].reduce(function (prev, elem) {
                return prev + $x.escapeElement(parentObj, elem, level);
            }, '') +

            $x.element('updated', level, formatDate(parentObj.updated)) + // REQUIRED (format: 2003-12-13T18:30:02Z)

            getPersons(parentObj, level) + 
            
            [
                'title', // REQUIRED // Validation above
                'subtitle',
                'rights'
            ].reduce(textReduction(parentObj, level), '') +

            (generator ? // We'll add our generator by default, but allow omission
                $x.element('generator', level, escapeContent(generator),
                    $x.escapeAttributes([
                        'uri', // @uri should be resolvable
                        'version'
                    ], generator)
                ) : '') +

            undefinedContentElement(parentObj, level, ['href', 'rel', 'type', 'hreflang', 'title', 'length'], 'link') + // can have undefinedContent // @href|@rel ("alternate" (default)|"related" (e.g., if about a specific site)|"self"|"enclosure" (should use with @length)|"via")|@type|@hreflang|@title|@length; @href is required if link present
            
            undefinedContentElement(parentObj, level, ['term', 'scheme', 'label'], 'category', 'categories') + // can have undefinedContent // @scheme is uri, @term and @label are text; @term is required if category present
            
            (parentObj.extensionElements ? $x.indent(level) + parentObj.extensionElements + '\n' : '') +
            
            getEntries(parentObj, level);
        },
        getEntries = function (parentObj, level, atts) {
            var nextLevel = level + 1;
            return parentObj.entries.reduce(function (prev, entry) {
                ['id', 'title', 'updated'].forEach(function (property) {
                    if (!entry[property]) {
                        throw 'Entry is missing a required property, ' + property;
                    }
                });

                var src = entry.src || (entry.content && typeof entry.content === 'object' && entry.content.src),
                    innerContent = typeof entry.content === 'string' ? entry.content : entry.content.content;
                return prev +
                    $x.parent('entry', level,
                        
                        $x.escapeElement(entry, 'id', nextLevel) + // REQUIRED (IRI)

                        [
                            'updated', // REQUIRED (format: 2003-12-13T18:30:02Z)
                            'published' // (created or availability date)
                        ].reduce(function (prev, elem) {
                            return prev + $x.element(elem, nextLevel, formatDate(entry[elem]));
                        }, '') +
                        
                        // ONE OR MORE AUTHORS REQUIRED HERE IN EACH ENTRY OR IN FEED
                        getPersons(entry, nextLevel) +
                        
                        [
                            'title', // REQUIRED // Validation above
                            'summary',
                            'rights'
                        ].reduce(textReduction(entry, nextLevel), '') +

                        undefinedContentElement(entry, nextLevel, ['href', 'rel', 'type', 'hreflang', 'title', 'length'], 'link') + // can have undefinedContent // @href|@rel ("alternate" (default)|"related" (e.g., if about a specific site)|"self"|"enclosure" (should use with @length)|"via")|@type|@hreflang|@title|@length; @href is required if link present
                        
                        undefinedContentElement(entry, nextLevel, ['term', 'scheme', 'label'], 'category', 'categories') + // can have undefinedContent // @scheme is uri, @term and @label are text; @term is required if category present
                        
                        (entry.extensionElements ? $x.indent(nextLevel) + entry.extensionElements + '\n' : '') +

                        (entry.source ? $x.parent('source', nextLevel, feedOrSource(entry.source, nextLevel)) : '') +

                        // "src" is apparently not supported in Firefox
                        // Todo: Clean this up (and any other still verbose constructs)
                        (src ?
                            $x.element('content', nextLevel, '', $x.escapeAttribute('type', entry.content && typeof entry.content === 'object' && entry.content.type) + $x.escapeAttribute('src', src)) : // content (@src (if present should be with @type=MIME and no content), otherwise type=text|html|xhtml (with h:div for xhtml))
                            (innerContent ?
                                ((entry.content && entry.content.type === 'xhtml') ?
                                    $x.parent('content', nextLevel,
                                        $x.element('div', nextLevel + 1, innerContent, $x.attribute('xmlns', 'http://www.w3.org/1999/xhtml')), // Do not escape
                                        $x.escapeAttribute('type', entry.content && entry.content.type)) :
                                        $x.element('content', nextLevel,
                                            (typeof entry.content === 'string' || // No type attribute, so treated as text
                                            (entry.content && typeof entry.content === 'object' &&
                                            (!entry.content.type || entry.content.type === 'html' || entry.content.type === 'text' || entry.content.type.match(/^text\//)))) ?
                                                $x.escapeXMLContent(innerContent) : // text or html
                                                entry.content.type.match(/[+\/]xml$/) ?
                                                innerContent : // XML (do not escape)
                                                innerContent, // other (base64 encoding: http://tools.ietf.org/html/rfc3548#section-3 ) // todo: handle
                                        $x.escapeAttribute('type', entry.content && typeof entry.content === 'object' && entry.content.type))) : '')
                        ),
                        atts
                    );
            }, '');
        };
    
    rootAttributes = $x.escapeAttribute('xmlns', 'http://www.w3.org/2005/Atom') + $x.escapeAttribute('xml:base', details.base) +
        ((details.lang || (details.lang !== false && defaults.lang)) ? $x.escapeAttribute('xml:lang', details.lang || defaults.lang) : ''); // We'll add English by default, but allow omission

    anyEntriesHaveAuthorsWithNames = !hasMember(details, 'entries') || ( // No entries
        ( // At least one author exists
            hasMember(details.entries, 'author') || hasMember(details.entries, 'authors')
        ) && allOptionalHaveRequiredProperty(details.entries, 'name', 'author') // All authors have names
    );
    // PERFORM SOME INITIAL VALIDATION AND DETECT WHETHER A SINGLE ENTRY
    // FEED OR ENTRY REQUIRED
    try {
        ['id', 'title', 'updated'].forEach(function (requiredProperty) {
            if (!details[requiredProperty]) { // Todo: change to return error code number?
                throw new Error('The required property "' + requiredProperty + '" was not supplied, or, if a single entry feed, ');
            }
        });
    }
    catch (e) {
        // If this is a single entry Atom form (without a feed), we can avoid the above required properties on the details object,
        //  but there must be (at least and only) a single entry with author(s)
        if (!hasMember(details, 'entries')) {
            throw e.message + 'you did not supply any entries';
        }
        if (details.entries > 1) {
            throw e.message + 'you supplied more than the allowed one entry.';
        }
        if (!anyEntriesHaveAuthorsWithNames) { // details.authors cannot help here since this is a single-entry document
            throw e.message + 'the authors requirement was not met.';
        }
        return $x.xmlDeclaration + getEntries(details, 0, rootAttributes);
    }

    return $x.xmlDeclaration +
        $x.parent('feed', 0, 
            feedOrSource(details, 1, true),
            rootAttributes
        );
};

module.exports = atom;

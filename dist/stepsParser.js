/**
 * This file is based on the code done by @alexkrechik: https://github.com/alexkrechik/VSCucumberAutoComplete
 */
"use strict";
var fs = require("fs");
var glob = require("glob");
var path = require("path");
var url = require('remote-origin-url');
var git = require('parse-git-config');
var LineLocation = (function () {
    function LineLocation(line, pos) {
        this.line = line;
        this.character = pos;
    }
    return LineLocation;
}());
var Location = (function () {
    function Location(file, pos) {
        this.line = pos;
        this.file = file;
    }
    Object.defineProperty(Location.prototype, "file", {
        get: function () {
            return this._filePath;
        },
        set: function (file) {
            this._filePath = path.resolve(path.dirname(file), path.basename(file));
            // Get git URL and relative path
            var gitMasterUrl = url.sync(this._filePath).replace(/\/$/, '');
            // git.resolve will return the configuration file --> '.git/config'
            var prefix = path.resolve(git.resolve(this._filePath), '..', '..');
            this.displayPath = this._filePath.replace(prefix, '').replace(/\\/g, '/').replace(/^\//, '');
            var gitExtraPath = '/';
            var suffix = '';
            if (gitMasterUrl.match(/http[s]?:\/\/[^\/]*bitbucket\.org/)) {
                gitExtraPath = '/src/master/';
                suffix = "#" + path.basename(file) + "-" + this.line.line;
            }
            else if (gitMasterUrl.contains(/http[s]?:\/\/[^\/]*github\.com/)) {
                // here we should parse the correct branch
                gitExtraPath = '/blob/master/';
            }
            else {
                console.log("Unknown git provider: " + gitMasterUrl);
            }
            this.gitURL = gitMasterUrl + gitExtraPath + this.displayPath + suffix;
        },
        enumerable: true,
        configurable: true
    });
    return Location;
}());
var workspaceRoot;
//Array will be populated with all the steps found
var steps = [];
// Object will be populated with all the pages found
var pages = {};
//Gerkin Reg ex
var gerkinRegEx = /^\s*(Given|When|Then|And|But) /;
// Object, which contains current configuration
var settings = {
    cucumberautocomplete: {
        steps: [],
        regExpStart: '',
        regExpEnd: '',
        pages: {},
    },
};
var CodeParser = (function () {
    /**
     * @param {Array<String>} stepsDir The directories from which to draw the steps
     */
    function CodeParser(stepsDir) {
        settings.cucumberautocomplete.steps = settings.cucumberautocomplete.steps.concat(stepsDir);
        populateStepsAndPageObjects();
    }
    /**
     * Matches a Gherkin expression against all the recorded steps
     * @param {string} line The Gherkin expression to parse
     * @returns {StepLine} The line that matches the gherkin expression, if found
     */
    CodeParser.prototype.ParseLine = function (line) {
        return handleLine(line);
    };
    return CodeParser;
}());
exports.CodeParser = CodeParser;
//get unique id for the elements ids
var id = {
    x: 0,
    get: function () {
        return this.x++;
    },
};
//Return start, end position and matched (if any) Gherkin step
function handleLine(line) {
    var typeRegEx = /Given |When |Then |And |But /;
    var typeMatch = line.match(typeRegEx);
    var typePart = typeMatch[0];
    var stepPart = line.replace(gerkinRegEx, '');
    var stepMatch;
    for (var i = 0; i < steps.length; i++) {
        if (line.trim().match(steps[i].reg) || stepPart.search(steps[i].reg) !== -1) {
            stepMatch = steps[i];
            break;
        }
    }
    var start = typeMatch.index;
    var end = typeMatch.index + typePart.length + stepPart.length;
    return {
        stepPart: stepPart,
        stepMatch: stepMatch,
        start: start,
        end: end,
    };
}
//Get all the steps from provided file
function getFileSteps(filePath) {
    var steps = [];
    var regExpStart, regExpEnd;
    if (settings) {
        regExpStart = settings.cucumberautocomplete.regExpStart || '\/';
        regExpEnd = settings.cucumberautocomplete.regExpEnd || '\/';
    }
    else {
        regExpStart = '\/';
        regExpEnd = '\/';
    }
    fs.readFileSync(filePath, 'utf8').split(/\r?\n/g).forEach(function (line, lineIndex) {
        // We need to figure out how to ommit the comments, otherwise this will also parse commented lines
        if (line.search(new RegExp('(Given|When|Then|And|But).*' + regExpStart + '.+' + regExpEnd, 'i')) !== -1) {
            //Get the '//' match
            var match = line.match(new RegExp(regExpStart + '(.+)' + regExpEnd));
            //Get matched text, remove start and finish slashes
            var matchText = match[1];
            var pos = new LineLocation(lineIndex, match.index);
            steps.push({
                id: 'step' + id.get(),
                reg: new RegExp(matchText),
                //We should remove text between quotes, '^|$' regexp marks and backslashes
                text: matchText.replace(/^\^|\$$/g, '').replace(/"\([^\)]*\)"/g, '""').replace(/\\/g, ''),
                desc: line.replace(/\{.*/, '').replace(/^\s*/, '').replace(/\s*$/, ''),
                def: new Location(filePath, pos),
            });
        }
    });
    return steps;
}
function getPageObjects(text, path) {
    var res = [];
    text.split(/\r?\n/g).forEach(function (line, i) {
        var poMatch = line.match(/[\s\.]([a-zA-z][^\s^\.]*)\s*[:=]/);
        if (poMatch) {
            var pos = new LineLocation(i, 0);
            if (!res.find(function (v) { return v.text === poMatch[1]; })) {
                res.push({
                    id: 'pageObect' + id.get(),
                    text: poMatch[1],
                    desc: line,
                    def: new Location(path, pos),
                });
            }
        }
    });
    return res;
}
//Get Page object
function getPage(name, path) {
    var text = fs.readFileSync(path, 'utf8');
    var zeroPos = new LineLocation(0, 0);
    return {
        id: 'page' + id.get(),
        text: name,
        desc: text.split(/\r?\n/g).slice(0, 10).join('\r\n'),
        def: new Location(path, zeroPos),
        objects: getPageObjects(text, path),
    };
}
//Current position of our cursor
var PositionType;
(function (PositionType) {
    PositionType[PositionType["Step"] = 0] = "Step";
    PositionType[PositionType["Page"] = 1] = "Page";
    PositionType[PositionType["PageObject"] = 2] = "PageObject";
})(PositionType || (PositionType = {}));
function getPositionObject(line, position) {
    var slicedLine = line.slice(0, position);
    var match = slicedLine.match(/"/g);
    if (match && match.length % 2) {
        //Double quote was opened but was not closed
        var pageMatch = slicedLine.match(/"([^"]*)"\."([^"]*)$/);
        var endLine = line.slice(position).replace(/".*/, '');
        if (pageMatch) {
            return {
                type: PositionType.PageObject,
                page: pageMatch[1],
                pageObject: pageMatch[2] + endLine,
            };
        }
        else {
            return {
                type: PositionType.Page,
                page: slicedLine.match(/([^"]*)$/)[1] + endLine,
            };
        }
    }
    else {
        return { type: PositionType.Step };
    }
}
function populateStepsAndPageObjects() {
    //Populate steps array
    var stepsPathes = [].concat(settings.cucumberautocomplete.steps);
    steps = [];
    stepsPathes.forEach(function (path) {
        glob.sync(path, { ignore: '.gitignore' }).forEach(function (f) {
            steps = steps.concat(getFileSteps(f));
        });
    });
    //Populate pages array
    var pagesObj = settings.cucumberautocomplete.pages;
    pages = {};
    Object.keys(pagesObj).forEach(function (key) {
        var path = pagesObj[key];
        pages[key] = getPage(key, path);
    });
}

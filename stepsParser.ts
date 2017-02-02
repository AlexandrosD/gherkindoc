/**
 * This file is based on the code done by @alexkrechik: https://github.com/alexkrechik/VSCucumberAutoComplete
 */

import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
const url = require('remote-origin-url');
const git = require('parse-git-config');

class LineLocation {
    public line : Number;
    public character : Number;
    constructor(line: Number, pos: Number) {
        this.line = line;
        this.character = pos;
    }
}

class Location {
    public line : LineLocation;
    public displayPath : string;
    public gitURL : string;
    private _filePath : string;
    set file(file: string) {
        this._filePath = path.resolve(path.dirname(file), path.basename(file));
        // Get git URL and relative path
        let gitMasterUrl = url.sync(this._filePath).replace(/\/$/, '');
        // git.resolve will return the configuration file --> '.git/config'
        let prefix = path.resolve(git.resolve(this._filePath), '..', '..');
        this.displayPath = this._filePath.replace(prefix, '').replace(/\\/g, '/').replace(/^\//, '');
        let gitExtraPath = '/';
        let suffix = '';
        if (gitMasterUrl.match(/http[s]?:\/\/[^\/]*bitbucket\.org/)) {
            gitExtraPath = '/src/master/';
            suffix = `#${path.basename(file)}-${this.line.line}`;
        } else if (gitMasterUrl.contains(/http[s]?:\/\/[^\/]*github\.com/)) {
            // here we should parse the correct branch
            gitExtraPath = '/blob/master/';
        } else {
            console.log(`Unknown git provider: ${gitMasterUrl}`);
        }
        this.gitURL = gitMasterUrl + gitExtraPath + this.displayPath + suffix;
    }
    get file() {
        return this._filePath;
    }
    constructor(file: string, pos: LineLocation) {
        this.line = pos;
        this.file = file;
    }
}


let workspaceRoot: string;
//Array will be populated with all the steps found
let steps : Array<Step> = [];
// Object will be populated with all the pages found
let pages = {};
//Gerkin Reg ex
let gerkinRegEx = /^\s*(Given|When|Then|And|But) /;
// Object, which contains current configuration
let settings = {
    cucumberautocomplete: {
        steps: [],
        regExpStart: '',
        regExpEnd: '',
        pages: {},
    },
};


export class CodeParser {
    /**
     * @param {Array<String>} stepsDir The directories from which to draw the steps
     */
    constructor(stepsDir : Array<String>) {
        settings.cucumberautocomplete.steps = settings.cucumberautocomplete.steps.concat(stepsDir);
        populateStepsAndPageObjects();
    }

    /**
     * Matches a Gherkin expression against all the recorded steps
     * @param {string} line The Gherkin expression to parse
     * @returns {StepLine} The line that matches the gherkin expression, if found
     */
    public ParseLine(line : string) : StepLine {
        return handleLine(line);
    }
}

//get unique id for the elements ids
let id = {
    x: 0,
    get() {
        return this.x++;
    },
};

interface Step {
    id: string;
    reg: RegExp;
    text: string;
    desc: string;
    def: Location;
}

interface StepLine {
    //Line without 'Given|When|Then|And' part
    stepPart: string;
    //Step, matched to the stepPart, or null if absent
    stepMatch: Step;
    //Start position of line
    start: number;
    //End position of line
    end: number;
}

interface PageObject {
    id: string;
    text: string;
    desc: string;
    def: Location;
}

interface Page {
    id: string;
    text: string;
    desc: string;
    def: Location;
    objects: PageObject[];
}

//Return start, end position and matched (if any) Gherkin step
function handleLine(line: String): StepLine {
    let typeRegEx = /Given |When |Then |And |But /;
    let typeMatch = line.match(typeRegEx);
    let typePart = typeMatch[0];
    let stepPart = line.replace(gerkinRegEx, '');
    let stepMatch;
    for (let i = 0; i < steps.length; i++) {
        if (line.trim().match(steps[i].reg) || stepPart.search(steps[i].reg) !== -1) {
            stepMatch = steps[i];
            break;
        }
    }
    let start = typeMatch.index;
    let end = typeMatch.index + typePart.length + stepPart.length;
    return {
        stepPart: stepPart,
        stepMatch: stepMatch,
        start: start,
        end: end,
    };
}

//Get all the steps from provided file
function getFileSteps(filePath: string): Step[] {
    let steps = [];
    let regExpStart, regExpEnd;
    if (settings) {
        regExpStart = settings.cucumberautocomplete.regExpStart || '\/';
        regExpEnd = settings.cucumberautocomplete.regExpEnd || '\/';
    } else {
        regExpStart = '\/';
        regExpEnd = '\/';
    }
    fs.readFileSync(filePath, 'utf8').split(/\r?\n/g).forEach((line, lineIndex) => {
        // We need to figure out how to ommit the comments, otherwise this will also parse commented lines
        if (line.search(new RegExp('(Given|When|Then|And|But).*' + regExpStart + '.+' + regExpEnd, 'i')) !== -1) {
            //Get the '//' match
            let match = line.match(new RegExp(regExpStart + '(.+)' + regExpEnd));
            //Get matched text, remove start and finish slashes
            let matchText = match[1];
            let pos = new LineLocation(lineIndex, match.index);
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

function getPageObjects(text: string, path: string): PageObject[] {
    let res = [];
    text.split(/\r?\n/g).forEach((line, i) => {
        let poMatch = line.match(/[\s\.]([a-zA-z][^\s^\.]*)\s*[:=]/);
        if (poMatch) {
            let pos = new LineLocation(i, 0);
            if (!res.find(v => {return v.text === poMatch[1]; })) {
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
function getPage(name: string, path: string): Page {
    let text = fs.readFileSync(path, 'utf8');
    let zeroPos = new LineLocation(0, 0);
    return {
        id: 'page' + id.get(),
        text: name,
        desc: text.split(/\r?\n/g).slice(0, 10).join('\r\n'),
        def: new Location(path, zeroPos),
        objects: getPageObjects(text, path),
    };
}


//Current position of our cursor
enum PositionType {
    Step,
    Page,
    PageObject
}

interface PositionObject {
    type: PositionType;
    page?: string;
    pageObject?: string;
}

function getPositionObject(line: string, position: number): PositionObject {
    let slicedLine = line.slice(0, position);
    let match = slicedLine.match(/"/g);
    if (match && match.length % 2) {
        //Double quote was opened but was not closed
        let pageMatch = slicedLine.match(/"([^"]*)"\."([^"]*)$/);
        let endLine = line.slice(position).replace(/".*/, '');
        if (pageMatch) {
            return {
                type: PositionType.PageObject,
                page: pageMatch[1],
                pageObject: pageMatch[2] + endLine,
            };
        } else {
            return {
                type: PositionType.Page,
                page: slicedLine.match(/([^"]*)$/)[1] + endLine,
            };
        }
    } else {
        return { type: PositionType.Step };
    }
}

function populateStepsAndPageObjects() {
    //Populate steps array
    let stepsPathes = [].concat(settings.cucumberautocomplete.steps);
    steps = [];
    stepsPathes.forEach((path) => {
        glob.sync(path, { ignore: '.gitignore' }).forEach(f => {
            steps = steps.concat(getFileSteps(f));
        });
    });

    //Populate pages array
    let pagesObj = settings.cucumberautocomplete.pages;
    pages = {};
    Object.keys(pagesObj).forEach((key) => {
        let path = pagesObj[key];
        pages[key] = getPage(key, path);
    });
}

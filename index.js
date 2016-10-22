var Gherkin = require('gherkin');
var Mustache = require('mustache');
var marked = require('marked');
var fs = require('fs');
var path = require('path');
var ncp = require('ncp').ncp;
var del = require('del');
var mkdirp = require('mkdirp');

var parser = new Gherkin.Parser();


/**
 * TODO:
 * - read input/ output dirs from command line
 * - APIfy
 * - package as npm module
 */
var featuresPath = './test/features/';
var outputDir = './test/output';

var htmlTemplates = {};
var scenaria = [];
var tagScenaria = [];

main();

/* ******************************************************************** */

/**
 * Entry point method
 */
function main() {
    // Load HTML templates
    loadHTMLTemplates();

    // clean existing files
    del.sync(outputDir);

    // Copy source files to output dir
    ncp(featuresPath, outputDir, function (err) {
        var tree = traverseTree(outputDir);
        // console.log(JSON.stringify(tree));
        processTree(tree);
        associateTags(function () {
            mkdirp(outputDir + '/tags', function (err) {
                if (err) {
                    console.log('ERROR: Could not create directory to store tags!');
                    console.log(err);
                }
                var tags = [];
                for (var tag in tagScenaria) {
                    tags.push({ name: tag, count: tagScenaria[tag].length });
                    generateTagHtml(tag);
                }
                generateIndex(tree);
                generateTocHtml(tree, tags);
            });
        });
    });
}

/**
 * Traverse a features directory and subdirectories and create a tree representing the features as GherkinDocuments
 * @param filename the directory to Traverse
 * @return treeNode
 */
function traverseTree(filename) {
    var stats = fs.lstatSync(filename);
    var treeNode = null;

    if (stats.isDirectory()) {
        var children = fs.readdirSync(filename).map(function (child) {
            return traverseTree(filename + '/' + child);
        });
        var treeNode = {
            path: filename,
            tocName: filename.replace(outputDir + '/', ''),
            name: path.basename(filename),
            link: null,
            type: 'directory',
            children: children,
            document: null
        };
    }
    else {
        if (filename.endsWith('.feature')) {
            // parse feature file
            var gherkinDoc = parseFeature(filename);

            // clean tagnames
            gherkinDoc.feature.tags.forEach(tag => {
                tag.name = tag.name.replace('@', '');
            });
            gherkinDoc.feature.children.forEach(child => {
                if (child.tags) {
                    child.tags.forEach(tag => {
                        tag.name = tag.name.replace('@', '');
                    });
                }
            });

            // collect scenaria for further processing
            gherkinDoc.feature.children.forEach(child => {
                child.featureTags = gherkinDoc.feature.tags;
            })
            scenaria = scenaria.concat(gherkinDoc.feature.children);
            // Determine the path to root folder
            var rootFolder = path.relative(filename + '/..', outputDir);
            // construct tree node
            treeNode = {
                path: filename,
                rootFolder: rootFolder ? rootFolder + '/' : '',
                name: path.basename(filename),
                tocName: gherkinDoc.feature.name,
                link: filename.replace(outputDir, './') + '.html',
                children: null,
                type: 'featurefile',
                document: gherkinDoc
            };
        }
        else {
            treeNode = {
                path: filename,
                name: path.basename(filename),
                tocName: null,
                link: null,
                children: null,
                type: 'file',
                document: null
            };
        }
    }

    return treeNode;
}

function associateTags(cb) {
    scenaria.forEach(scenario => {
        // inherit feature tags
        if (scenario.tags) {
            scenario.tags = scenario.tags.concat(scenario.featureTags);
        }
        else {
            scenario.tags = scenario.featureTags;
        }
        scenario.tags.forEach(tag => {
            tagName = tag.name;
            if (!tagScenaria[tagName]) {
                tagScenaria[tagName] = [];
            }
            tagScenaria[tagName].push(scenario);
        });
    });
    cb();
}

/**
 * Parse a feature file whith Gherkin parser and transform it to Gherkin ast
 * @param featureFilename the filename fo the feature
 * @return the Gherkin document
 */
function parseFeature(featureFilename) {
    console.log('Processing ' + featureFilename);
    var featureBody = fs.readFileSync(featureFilename, 'UTF-8');
    var gherkinDocument = parser.parse(featureBody);

    // Parse markdown
    var description = gherkinDocument.feature.description
        .trim()
        .replace(/\t/g, ' ')
        .replace(/\n[ ]{4}/g, '\n'); // TODO replace spaces at the beggining of the line only

    gherkinDocument.feature.description = marked(description);
    return gherkinDocument;
}

/**
 * Generate an HTML file for a given feature
 * @param treeNode
 */
function generateHtml(treeNode) {
    var output = Mustache.render(htmlTemplates.feature, { document: treeNode.document, rootFolder: treeNode.rootFolder }, htmlTemplates);
    fs.writeFileSync(treeNode.path + '.html', output);
}

function generateTocHtml(tree, tags) {
    // Sort tags by name and assign them to the tree
    tags.sort(compareTagNames);
    tree.tags = tags;
    var output = Mustache.render(htmlTemplates.toc, tree, htmlTemplates);
    fs.writeFileSync(outputDir + '/toc.html', output);
}

function generateIndex(tree) {
    var output = Mustache.render(htmlTemplates.index, tree, htmlTemplates);
    fs.writeFileSync(outputDir + '/index.html', output);
    output = Mustache.render(htmlTemplates.main, tree, htmlTemplates);
    fs.writeFileSync(outputDir + '/main.html', output);
}

function generateTagHtml(tag) {
    var output = Mustache.render(htmlTemplates.tag, { tag: tag, scenaria: tagScenaria[tag], rootFolder: '../' }, htmlTemplates);
    fs.writeFileSync(outputDir + '/tags/' + tag + '.html', output);
}

/**
 * Process the tree representing the directory structure with the parsed feature files
 * @param the tree node to process
 */
function processTree(treeNode) {
    if (treeNode.type == 'featurefile') {
        generateHtml(treeNode);
    }
    if (treeNode.type == 'directory') {
        treeNode.children.forEach(childNode => {
            processTree(childNode);
        });
    }
}

function loadHTMLTemplates() {
    htmlTemplates = {
        index: fs.readFileSync('./templates/index.mustache', 'UTF-8'),
        main: fs.readFileSync('./templates/main.mustache', 'UTF-8'),
        feature: fs.readFileSync('./templates/feature.mustache', 'UTF-8'),
        tag: fs.readFileSync('./templates/tag.mustache', 'UTF-8'),
        scenario: fs.readFileSync('./templates/scenario.mustache', 'UTF-8'),
        header: fs.readFileSync('./templates/header.mustache', 'UTF-8'),
        footer: fs.readFileSync('./templates/footer.mustache', 'UTF-8'),
        toc: fs.readFileSync('./templates/toc.mustache', 'UTF-8'),
        tocNode: fs.readFileSync('./templates/tocNode.mustache', 'UTF-8'),
        css: fs.readFileSync('./templates/css.mustache', 'UTF-8')
    }
}

function compareTagNames(aTag, bTag) {
    if (aTag.name < bTag.name)
        return -1;
    if (aTag.name > bTag.name)
        return 1;
    return 0;
}

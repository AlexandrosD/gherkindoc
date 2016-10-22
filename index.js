var Gherkin = require('gherkin');
var Mustache = require('mustache');
var marked = require('marked');
var fs = require('fs');
var path = require('path');
var ncp = require('ncp').ncp;
var del = require('del');
var parser = new Gherkin.Parser();

var featuresPath = './test/features/';
var outputDir = './test/output';

var htmlTemplates = {};
var toc = { path: './', name: 'root', type: 'root', children: [] };

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
        var tree = dirTree(outputDir);
        console.log(JSON.stringify(tree));

        console.log("*****************************");
        toc.children.push(createToc(outputDir));
        console.log(JSON.stringify(toc));

        processTree(tree);
    });
}

/**
 * Traverse a features directory and subdirectories and create a tree representing the features as GherkinDocuments
 * @param filename the directory to Traverse\
 * @return treeNode
 */
function dirTree(filename) {
    var stats = fs.lstatSync(filename),
        treeNode = {
            path: filename,
            name: path.basename(filename)
        };

    if (stats.isDirectory()) {
        treeNode.type = 'directory';
        treeNode.children = fs.readdirSync(filename).map(function (child) {
            return dirTree(filename + '/' + child);
        });
    }
    else {
        if (filename.endsWith('.feature')) {
            treeNode.type = 'featurefile';
            treeNode.document = parseFeature(filename);
        }
        else {
            treeNode.type = 'file';
        }
    }

    return treeNode;
}

/**
 * Create table of contents
 */
function createToc(filename) {
    var stats = fs.lstatSync(filename);
    var treeNode = null;
    if (stats.isDirectory()) {
        var treeNode = {
            path: filename,
            name: path.basename(filename)
        };
        treeNode.type = 'directory';
        var children = fs.readdirSync(filename).map(function (child) {
            return createToc(filename + '/' + child);
        });
        if (children) {
            treeNode.children = children;
        }
        else {
            treeNode.children = null;
        }
    }
    else if (filename.endsWith('.feature')) {
        treeNode = {
            path: filename,
            name: path.basename(filename),
            children: null
        };
        treeNode.type = 'featurefile';
    }

    return treeNode;
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
    var sidebar = Mustache.render(htmlTemplates.sidebar, toc, htmlTemplates);
    var output = Mustache.render(htmlTemplates.feature, { document: treeNode.document, sidebar: sidebar }, htmlTemplates);
    fs.writeFileSync(treeNode.path + '.html', output);
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
        feature: fs.readFileSync('./templates/feature.mustache', 'UTF-8'),
        scenario: fs.readFileSync('./templates/scenario.mustache', 'UTF-8'),
        header: fs.readFileSync('./templates/header.mustache', 'UTF-8'),
        footer: fs.readFileSync('./templates/footer.mustache', 'UTF-8'),
        sidebar: fs.readFileSync('./templates/sidebar.mustache', 'UTF-8'),
        tocNode: fs.readFileSync('./templates/tocNode.mustache', 'UTF-8')
    }
}

// TODO
/**
 * Accept as parameter a file path
 * Read all the features and structure from there
 * Copy all non .feature files as they may be static resources
 * Produce html
 */
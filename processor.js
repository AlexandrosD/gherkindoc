var path = require('path');
var fs = require('fs');
var htmlGenerator = require('./htmlGenerator');
var markdownParser = require('./markdownParser');
var Gherkin = require('gherkin');
var parser = new Gherkin.Parser();

var processor = {
    scenaria: [],
    scenariaPerTag: [],

    /**
     * Process a feature files' directory
     * @param filename the features' directory
     * @param outputDir where to output the generated html files
     */
    process: function (filename, outputDir) {
        var tree = processor.traverseDirectory(filename, outputDir);
        processor.associateTags(processor.scenaria);
        tree.scenaria = processor.scenaria;
        tree.scenariaPerTag = processor.scenariaPerTag;
        tree.tags = [];
        for (tag in tree.scenariaPerTag) {
            tree.tags.push({ name: tag, count: tree.scenariaPerTag[tag].length });
        }
        // Sort tags by name
        tree.tags.sort(function (aTag, bTag) {
            if (aTag.name < bTag.name)
                return -1;
            if (aTag.name > bTag.name)
                return 1;
            return 0;
        });
        return tree;
    },

    /**
     * Traverse a features directory and subdirectories and construct a tree representing the features as GherkinDocuments
     * @param filename the directory to Traverse
     * @return treeNode
     */
    traverseDirectory: function (filename, outputDir) {
        var stats = fs.lstatSync(filename);
        var treeNode = null;

        if (stats.isDirectory()) {
            var children = fs.readdirSync(filename).map(function (child) {
                return processor.traverseDirectory(filename + '/' + child, outputDir);
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
                var gherkinDoc = processor.parseFeature(filename);

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
                    child.featureName = gherkinDoc.feature.name;
                })
                processor.scenaria = processor.scenaria.concat(gherkinDoc.feature.children);
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
    },

    /**
     * Parse a feature file whith Gherkin parser and transform it to Gherkin ast
     * @param featureFilename the filename fo the feature
     * @return the Gherkin document
     */
    parseFeature: function (featureFilename) {
        var featureBody = fs.readFileSync(featureFilename, 'UTF-8');
        var gherkinDocument = parser.parse(featureBody);

        // Parse markdown
        gherkinDocument.feature.description = markdownParser.markdownToHtml(gherkinDocument.feature.description);
        gherkinDocument.feature.children.forEach(child => child.description = markdownParser.markdownToHtml(child.description));
        return gherkinDocument;
    },

    /**
     * Create associations between tags and scenaria
     */
    associateTags: function (scenaria) {
        scenaria.forEach(scenario => {
            // inherit feature tags
            if (scenario.tags) {
                scenario.tags = scenario.tags.concat(scenario.featureTags);
            }
            else {
                scenario.tags = scenario.featureTags;
            }
            // process tags
            scenario.tags.forEach(tag => {
                tagName = tag.name;
                if (!processor.scenariaPerTag[tagName]) {
                    processor.scenariaPerTag[tagName] = [];
                }
                processor.scenariaPerTag[tagName].push(scenario);
            });
        });
    }
}

module.exports = processor;
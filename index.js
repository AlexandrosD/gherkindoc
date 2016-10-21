var Gherkin = require('gherkin');
var Mustache = require('mustache');
var marked = require('marked');
var fs = require('fs');
var ncp = require('ncp').ncp;
var del = require('del');
var parser = new Gherkin.Parser();

var featuresPath = './test/features/';
var outputDir = './test/output/';

// clean existing files
del.sync(outputDir);

// Copy source files to output dir
ncp(featuresPath, outputDir, function (err) {
    processFeatures(outputDir);
});

function processFeatures(dir) {
    fs.readdir(dir, (err, files) => {
        files.forEach(file => {
            var path = dir + '/' + file;
            if (fs.lstatSync(path).isDirectory()) {
                processFeatures(dir + file);
            }
            if (file.endsWith('.feature')) {
                generateFeatureHtml(path);
            }
        });
    })
}

function generateFeatureHtml(featureFilename) {
    console.log('Processing ' + featureFilename);
    var featureBody = fs.readFileSync(featureFilename, 'UTF-8');
    console.log(featureBody);
    var gherkinDocument = parser.parse(featureBody);

    console.log('******************************');
    console.log(JSON.stringify(gherkinDocument));
    console.log('******************************');

    // Parse markdown
    var description = gherkinDocument.feature.description
        .trim()
        .replace(/\n[ ]{4}/g, '\n')
        .replace(/\t/g, '');
    gherkinDocument.feature.description = marked(description);

    // Read mustache templates
    var templates = {
        feature: fs.readFileSync('./templates/feature.mustache', 'UTF-8'),
        scenario: fs.readFileSync('./templates/scenario.mustache', 'UTF-8'),
        header: fs.readFileSync('./templates/header.mustache', 'UTF-8'),
        footer: fs.readFileSync('./templates/footer.mustache', 'UTF-8')
    }

    var output = Mustache.render(templates.feature, gherkinDocument, templates);

    fs.writeFileSync(featureFilename + '.html', output);
}

// TODO
/**
 * Accept as parameter a file path
 * Read all the features and structure from there
 * Copy all non .feature files as they may be static resources
 * Produce html
 */
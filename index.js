var fssync = require('fs-sync');
var del = require('del');
var htmlGenerator = require('./htmlGenerator');
var processor = require('./processor');


function generate(featuresPath, outputDir, options) {
    // clean existing files
    del.sync(outputDir);
    // Copy source files to output dir
    fssync.copy(featuresPath, outputDir);
    // traverse and process the directory structure
    var tree = processor.process(outputDir, outputDir); // TODO refactor:
    // Generate HTML files
    htmlGenerator.generate(tree, outputDir, options);
}

module.exports = {
    generate: generate
};

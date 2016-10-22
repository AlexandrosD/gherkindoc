GherkinDoc
==========

A processor that transforms Cucumber (Gherkin) feature files into static HTML documentation site.

Usage:
```javascript
var gherkindoc = require('gherkindoc');
gherkindoc.generate(featuresDirectory, outputDirectory, function () {
    // done.
});
```
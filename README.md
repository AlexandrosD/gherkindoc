GherkinDoc
==========

A processor that transforms Cucumber (Gherkin) feature files into static HTML documentation site.

Usage:
```javascript
var gherkindoc = require('gherkindoc');
gherkindoc.generate(featuresDirectory, outputDirectory [, options]);
```

The following options are available (defaults are shown):
```javascript
{
    theme: 'cosmo', // The [bootswatch](http://bootswatch.com/) theme to use
    renderScenaria: true // whether to render scenario bodies or only feature descriptions
}
```

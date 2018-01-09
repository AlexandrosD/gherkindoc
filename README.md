GherkinDoc with Step Detection
==========

A processor that transforms Cucumber (Gherkin) feature files into static HTML documentation site. Indicates which steps have an implementation
and links them to their github or bitbucket repository. Additionally creates two new tags: 'Implemented' and 'Not Implemented' to list the
steps that are complete.

This project is a fork from the [GherkinDoc](https://github.com/AlexandrosD/gherkindoc) project, started by @alexandrosd.
It contains additional code developed by @alexkrechik on the [VSCucumberAutoComplete](https://github.com/alexkrechik/VSCucumberAutoComplete) project.


Usage:
```javascript
var gherkindoc = require('gherkindoc');
gherkindoc.generate(featuresDirectory, outputDirectory [, options]);
```
This version doesn't copy the entire featuresDirectory over to outputDirectory. Instead, creates only .html files in the outputDirectory.


The following options are available (defaults are shown):
```javascript
{
    theme: 'cosmo', // The [bootswatch](http://bootswatch.com/) theme to use
    renderScenaria: true // whether to render scenario bodies or only feature descriptions,
    steps: [] // A list of paths where the steps are stored
}
```

If the parameter steps is not given, then all the steps and features will be marked as not implemented.

Original Author: Alexandros Dallas <dallas.alexandros@gmail.com>

Fork Author: Josep Mateu Clemente <jmateu.clemente@gmail.com>
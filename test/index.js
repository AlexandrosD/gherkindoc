var del = require('del');
var fs = require('fs');
var expect = require('chai').expect;
var gherkindoc = require('../index');

var features = './test/features/';
var outputDir = './test/output/';

describe('GherkinDoc', function () {
    beforeEach(function () {
        del.sync(outputDir);
    });
    it('generates documentation site', function () {
        gherkindoc.generate(features, outputDir, { theme: 'simplex', renderScenaria: true });

        expect(fs.lstatSync(outputDir + 'index.html').isFile()).to.be.true;

        expect(fs.lstatSync(outputDir + 'nested').isDirectory()).to.be.true;
        expect(fs.lstatSync(outputDir + 'nested/nested.feature.html').isFile()).to.be.true;

        expect(fs.lstatSync(outputDir + 'tags').isDirectory()).to.be.true;
        expect(fs.lstatSync(outputDir + 'tags/Backlog.html').isFile()).to.be.true;
    });
});
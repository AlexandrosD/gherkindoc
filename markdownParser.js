var marked = require('marked');

var markdownParser = {

    /**
     * Generates HTML from Markdown notation
     */
    markdownToHtml: function (markdown) {
        if (!markdown) return;
        markdown = markdown
            // Trim
            .trim()
            // Replace confluence-style headings with standard markdown
            .replace(/h1\. /g, '# ')
            .replace(/h2\. /g, '## ')
            .replace(/h3\. /g, '### ')
            .replace(/h4\. /g, '#### ')
            .replace(/h5\. /g, '##### ')
            .replace(/h6\. /g, '###### ')
            // Replace tabs
            .replace(/\t/g, ' ')
            // Replace more than one spaces with space
            .replace(/  +/g, ' ');

        return marked(markdown);
    }

}

module.exports = markdownParser

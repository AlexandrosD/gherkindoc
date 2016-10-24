var marked = require('marked');

var markdownParser = {

    /**
     * Generates HTML from Markdown notation
     */
    markdownToHtml: function (markdown) {
        if (!markdown) return;
        markdown = markdown
            .trim()
            .replace(/\t/g, ' ')
            .replace(/^[ ]+/g, '\n'); // replace spaces at the beggining of the line
        return marked(markdown);
    }
}

module.exports = markdownParser

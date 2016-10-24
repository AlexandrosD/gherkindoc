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
            .replace(/\n[ ]{4}/g, '\n'); // TODO replace spaces at the beggining of the line only
        return marked(markdown);
    }
}

module.exports = markdownParser

# Creating the Manuscript

This directory contains the manuscript for `dms-viz`. The body of the manuscript is in the `paper.md` file and the citations are in better bibtex format in the `paper.bib` file.

## Formatting

The manuscript is written in markdown and formatted into a PDF with [Pandoc](https://pandoc.org/).

### For JOSS

The manuscript is formatted for submission to JOSS on push events via [this github actions](https://github.com/marketplace/actions/open-journals-pdf-generator) script and saved as an artifact.

### For bioarXiv

The manuscript is formatted for bioarXiv as a 'plain' PDF file using the following Pandoc command:

```bash
pandoc -s paper.md --citeproc \
--pdf-engine=xelatex \
--template=template.tex \
-V linkcolor=blue \
-V geometry:margin=1in \
-o paper.pdf
```

The format is dictated by the `template.tex` file, which is a spliced together combo of the default Pandoc template with some additions to deal with authors and affiliations in the metadata format JOSS requires.

MDQ
===

> [WARNING]
> This is a work in progress. The specification is not yet stable and may change
> in the future. The reference implementations are also under development and
> may not yet support all features described in this document.

`MDQ` defines a simple file format to declare questions for a LMS environment
using straightforward Markdown idioms. This has a similar scope as other formats
such as GIFT and AIKEN. However, by using Markdown as the underlying format, MDQ
users can leverage existing Markdown and (both human and LLM) familiarity with
this ubiquitous format.

`MDQ` files can declare single questions or exams. Both use the same file
extension -- either `.mdq` or `.mdq.md` -- and are told apart by their
content rather than by their name. The `.mdq.md` spelling exists so that
editors and forges that key off `.md` still treat the file as Markdown.

This document describes the accepted questions formats and their respective
syntax. The `MDQ` project [Python](https://github.com/codehood-lms/mdq.py) and
[Typescript](https://github.com/codehood-lms/mdq.js) implementations. Each have
parsers that can be used to parse and validate `MDQ` documents.


## Questions format

Questions are written as markdown documents, with very little cerimony and extra
syntax. Bellow is a very simple multiple-choice question, for example:

```md
[Q1] How much is 2 + 2?
* [ ] 2 
* [ ] 3
* [*] 4
* [ ] 5
```

MDQ accepts several question formats, each with its own specific syntax and 
options

* **Multiple choice**
* **Multiple selection**
* **Open/Essay**
* **True/False**
* **Fill in the blanks**
* **Associative**
* **Repository questions** 


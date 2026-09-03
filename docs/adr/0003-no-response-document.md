# There is no response document

MDQ specifies questions and exams, and deliberately does not specify what a
student's response looks like as a document. Responses exist only as inputs to
the library's grading functions: there is no Markdown surface, and no example 
pairs. `ExamScore` is likewise a returntype rather than a document.

## Considered options

Giving responses a schema without a Markdown surface was the near miss. It is
attractive for one real reason: two systems exchanging responses -- an LMS and
a grading service, or `mdq.py` and `mdq.js` sharing fixtures -- then share a
format instead of each inventing one.

It was rejected because responses belong to the system that collects them.
Nobody hand-authors a student's answers, so the Markdown surface that justifies
MDQ's existence has nothing to do here; and a stored response immediately
raises questions the format has no business answering -- who submitted it, when,
under what attempt, and how it is retained. Identity in particular was ruled
out explicitly: representing a student is the LMS's job, and putting a field
for it in the spec would hand MDQ obligations under LGPD and GDPR in exchange
for a convenience.

## Consequences

The CLI gains no grading command. `mdq score exam.yaml <responses>` would need
responses from a file, and whatever shape that file took would become a de
facto response format the moment anyone scripted against it -- reintroducing
this decision through the back door, undocumented and unversioned.

Test fixtures still need response data, which lives in `<name>.responses.yaml`
beside each example: a list of `{response, grade}` pairs. That file is test
data, not a format. It is also the natural cross-implementation fixture, since
`mdq.js` can consume the same table to prove it agrees with `mdq.py`.

Because responses carry no identity and questions need not carry ids, grading
requires an *addressable* document -- every question and choice carrying an id
-- and raises when one is not. Supplying those ids is the consuming system's
job, which is the point: it knows the filename, the database key and the
attempt, and the document does not.

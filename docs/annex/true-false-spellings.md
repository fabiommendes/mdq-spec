# True/False spellings

This document is a reference for the spelling of True and False in many different
world languages. It is the source data of the letter sets and of the locale table
of [true-false.md](../question-types/true-false.md).

## Method

* Ranking: the 32 languages with most speakers (Ethnologue figures, see the
  references). Gujarati, Polish, Ukrainian and Malay are cited because they are
  in the locale table or in the classification.
* Words: the language packs of Moodle 4.5, file `qtype_truefalse.php`, which
  holds the strings of the true/false question. When a pack has no such
  string, the table uses a `correct`/`incorrect` string of another component.
* Test convention: the letters or marks that authors use in tests, textbooks
  and learning platforms. It is the practice that decides a letter, not the
  romanization.
* Romanization: the usual Latin initial of the transliteration. People do not
  write a romanization as a marker, unless the "Test convention" column says so.
* "(unverified)" marks an entry without a good source (general knowledge or a
  dictionary only).

## Languages

| Language | Subtag | True | False | First code point (T / F) | Romanization (T / F) | Test convention |
| -------- | ------ | ---- | ----- | ------------------------ | -------------------- | --------------- |
| English | `en` | true | false | t / f | T / F | T/F |
| Mandarin | `zh` | 对 (正确) | 错 (错误) | 对 / 错 | D (duì) / C (cuò) | 对/错, √/×, 是/否 |
| Mandarin, Taiwan | `zh-Hant-TW` | 是 | 非 | 是 / 非 | S (shì) / F (fēi) | 是/非 (unverified) |
| Hindi | `hi` | सही (सत्य) | गलत (असत्य) | स / ग | S (sahi) / G (galat) | सही/गलत |
| Spanish | `es` | verdadero (cierto) | falso | v / f | V / F | V/F |
| Arabic | `ar` | صح (صحيح) | خطأ | ص / خ | S (sahh) / K (khata) | صح/خطأ, ✓/✗ |
| French | `fr` | vrai | faux | v / f | V / F | V/F |
| Bengali | `bn` | সত্য | মিথ্যা | স / ম | S (satya) / M (mithya) | সত্য/মিথ্যা; ঠিক/ভুল (unverified) |
| Portuguese | `pt` | verdadeiro (certo) | falso (errado) | v / f | V / F | V/F; C/E in Cebraspe tests |
| Indonesian | `id` | benar | salah | b / s | B / S | **B/S** |
| Urdu | `ur` | صحیح (سچ) | غلط (جھوٹ) | ص / غ | S (sahih) / G (ghalat) | صحیح/غلط |
| Russian | `ru` | верно | неверно | в / н | V (verno) / N (neverno) | верно/неверно |
| German | `de` | wahr | falsch | w / f | W / F | W/F, or R/F for richtig/falsch (unverified) |
| Japanese | `ja` | ○ (正しい, 真) | × (誤り, 偽) | ○ (So) / × (Sm) | M (maru) / B (batsu) | **○/×** |
| Nigerian Pidgin | `pcm` | true | false (lie) | t / f | T / F | English (unverified) |
| Egyptian Arabic | `arz` | صح | غلط | ص / غ | S (sahh) / G (ghalat) | standard Arabic at school (unverified) |
| Marathi | `mr` | बरोबर | चूक | ब / च | B (barobar) / C (chuk) | बरोबर/चूक; खरे/खोटे (unverified) |
| Vietnamese | `vi` | Đúng | Sai | Đ (U+0110) / S | D / S | **Đ/S** |
| Telugu | `te` | ఒప్పు | తప్పు | ఒ / త | O (oppu) / T (tappu) | ఒప్పు/తప్పు |
| Swahili | `sw` | Kweli (Ndiyo) | Sio kweli (Hapana) | k / s | K / S | Kweli/Sio kweli |
| Hausa | `ha` | gaskiya | ƙarya | g / ƙ (U+0199) | G / K | (unverified) |
| Turkish | `tr` | Doğru | Yanlış | d / y | D / Y | **D/Y** |
| Western Punjabi | `pnb` | صحیح / ਸਹੀ | غلط / ਗਲਤ | ص, ਸ / غ, ਗ | S / G | (unverified) |
| Tagalog | `tl`, `fil` | Tama | Mali | t / m | T / M | Tama/Mali |
| Tamil | `ta` | சரி | தவறு | ச / த | S (sari) / T (thavaru) | சரி/தவறு |
| Cantonese | `yue` | 對 | 錯 | 對 (U+5C0D) / 錯 (U+932F) | D (deoi) / C (co) | 對/錯, ✓/✗ (unverified) |
| Wu | `wuu` | as in Mandarin | as in Mandarin | 对 / 错 | | as in Mandarin (unverified) |
| Persian | `fa` | صحیح (درست) | غلط (نادرست) | ص / غ | S / G (D / N) | صحیح/غلط |
| Korean | `ko` | 참 (맞다) | 거짓 (틀리다) | 참 / 거 | C (cham) / G (geojit) | **O/X** |
| Amharic | `am` | እውነት | ሐሰት | እ / ሐ | E (ewnet) / H (hasset) | (unverified) |
| Thai | `th` | ถูก (จริง) | ผิด (เท็จ) | ถ / ผ | T (thuk) / P (phit) | ถูก/ผิด |
| Javanese | `jv` | bener | salah (luput) | b / s | B / S | Indonesian at school (unverified) |
| Italian | `it` | Vero | Falso | v / f | V / F | V/F |
| Malay | `ms` | betul | salah | b / s | B / S | (unverified) |
| Gujarati | `gu` | સાચું | ખોટું | સ / ખ | S (sachu) / K (khotu) | (unverified) |
| Kannada | `kn` | ಸರಿ | ತಪ್ಪು | ಸ / ತ | S / T | (Moodle `correct`/`incorrect`) |
| Polish | `pl` | Prawda | Fałsz | p / f | P / F | Prawda/Fałsz |
| Ukrainian | `uk` | Правильно | Неправильно | П / Н | P / N | (Moodle) |

Notes:

* Hindi uses सही/गलत in Moodle, not सत्य/असत्य. Both words are valid, and the
  table lists सही first because it is the one used in tests.
* Arabic uses صح in Moodle, not صحيح. The initial is the same.
* The ○/× marks of Japanese and Korean (and O/X in Korean) are not letters.
  See the notes of the locale section of true-false.md.

## Classification of the candidate letters

The criterion is a guide, in
[true-false.md](../question-types/true-false.md#why-a-letter-is-true-false-or-warning):
a letter joins TRUE or FALSE when it has no conflict in actual practice. A
romanization is not practice. The lists of true-false.md and the tables below
decide the category. The criterion explains most rows, not all of them. A yes
or no initial is not a conflict.

### Promoted

| Letter | Class | True in | False in | Reason |
| ------ | ----- | ------- | -------- | ------ |
| `T` | TRUE | en, tl (Tama), th | te, ta (tappu, thavaru: romanization only) | Practice is true. The conflicts are romanizations. |
| `V` | TRUE | es, fr, pt, it | none | No conflict. |
| `F` | FALSE | en, es, fr, pt, de, it | none | No conflict. |
| `D` | TRUE | tr (Doğru, D/Y practice) | none | No conflict. fa, zh and yue add romanizations. |
| `Đ` `đ` | TRUE | vi (Đúng, Đ/S practice) | none | No conflict. NFKC does not map `Đ` to `D`, and ASCII lowercase does not map `Đ` to `đ`, so both cases are listed. |
| `B` | TRUE | id (benar, B/S practice), mr, jv, ms | bn "bhul" and ja "batsu" (romanizations of secondary forms) | The only conflicts are romanizations. |
| `E` | FALSE | am (ewnet, romanization, unverified) | pt (errado, C/E practice) | The conflict is a romanization. "Yes" in Turkish ("evet") does not count. |
| `Y` | FALSE | none | tr (Yanlış, D/Y practice) | No conflict. "Yes" in English and Indonesian does not count. |
| `M` | FALSE | none | tl (Mali), bn (mithya, romanization) | The conflicts are ko "majda" and ja "maru", romanizations that nobody writes as a marker. |
| 对 對 是 真 | TRUE | zh, yue, zh-Hant, ja | none | Han letters. 對 is the traditional form of 对 (unverified). |
| 错 錯 非 偽 | FALSE | none | zh, yue, zh-Hant, ja | Han letters. 錯 is the traditional form of 错 (unverified). |
| 참 / 거 | TRUE / FALSE | ko | ko | Moodle ko (참/거짓). |
| В в | TRUE | ru (верно) | none | Homoglyph of Latin `B`, which is TRUE too. |
| Н н | FALSE | none | ru (неверно) | Homoglyph of Latin `H`, which is WARNING. Each code point has its own category. |
| ص / خ / غ | TRUE / FALSE / FALSE | ar, ur, fa | ar, ur, fa | Moodle ar, ur and fa. |
| स / ग | TRUE / FALSE | hi | hi | Moodle hi (सही/गलत). |
| ब / च | TRUE / FALSE | mr | mr | Moodle mr (बरोबर/चूक). |
| স / ম | TRUE / FALSE | bn | bn | Moodle bn. |
| ఒ / త | TRUE / FALSE | te | te | Moodle te. |
| ச / த | TRUE / FALSE | ta | ta | Moodle ta. |
| ถ / ผ | TRUE / FALSE | th | th | Moodle th. |
| સ / ખ | TRUE / FALSE | gu | gu | Moodle gu (સાચું/ખોટું). ખ has a weak conflict with Marathi "khare" (unverified). |

None of the non-Latin letters has evidence of use as a bracket marker in tests.
Authors of these languages write the whole word, or ○/×, √/× or O/X. Promoting
them costs nothing, but the practical gain is small.

### Conflict (kept in WARNING)

| Letter | True in | False in | Reason |
| ------ | ------- | -------- | ------ |
| `S` | hi, ar, bn, ur, ta, ja, zh-Hant (all romanizations) | id, ms, jv (salah), vi (sai), sw (Sio kweli): real practice | The practice is false. It was in TRUE before and graded Indonesian and Vietnamese documents wrong without a warning. |
| `C` | pt (certo, C/E practice), es (cierto) | zh (cuò, romanization of 错), yue, mr (chuk) | Kept out by decision, not by the criterion. The `pt` row accepts it. |
| `G` | ha (gaskiya, unverified) | hi (galat, Moodle), ur, fa, arz, ko (romanizations) | The only true side is unverified. |
| `K` | sw (Kweli): words only | ha, ar (khata), gu (khotu): romanizations | Swahili against Arabic. No letter practice on the true side. |
| `N` | te (nijam, romanization) | ru, fa (romanizations) | No practice. |
| `W` | de (wahr, Moodle) | en (wrong) | German against English. |
| `P` | pl (Prawda), ru, uk (pravda, pravilno): words only | th (phit, romanization) | No letter practice in Polish tests. |
| `H` | none | am (hasset, romanization, unverified) | No practice. |
| `J` | th (jing, romanization) | ur (jhoot, romanization) | No practice. |
| `O` | ko, ja (O/X practice), te (oppu) | none | Needs `X`, which is reserved. The `ja` and `ko` rows accept it. |
| `A` | none | hi (asatya), te (abaddham) | No practice. Also the first option of a multiple-choice list. |
| `L` `U` `R` `Ƙ` | R: de (richtig, R/F practice, unverified) | L: ru (lozh). U: sw (uongo). Ƙ: ha (ƙarya) | No practice, or no source. |

## References

* [Collins English-Hindi Dictionary: "true"](https://www.collinsdictionary.com/dictionary/english-hindi/true)
* [HinKhoj: "true false" meaning in Hindi](https://hinkhojdictionary.com/english-hindi/true%20false-meaning-in-hindi)
* [bab.la: "true or false" English-French](https://en.bab.la/dictionary/english-french/true-or-false)
* [PONS: "true-false" English-German](https://en.pons.com/translate/english-german/true-false)
* [Arabic123: Sahih (صحيح): True, Correct in Arabic](https://arabic123.com/words/opposites/true)
* [bab.la: "true or false" English-Arabic](https://en.bab.la/dictionary/english-arabic/true-or-false)
* [Wiktionary: सत्य, Sanskrit root shared by Hindi and Bengali "satya"](https://en.wiktionary.org/wiki/%E0%A4%B8%E0%A4%A4%E0%A5%8D%E0%A4%AF)
* [Shabdkosh: "false" meaning in Bengali](https://www.shabdkosh.com/dictionary/english-bengali/false/false-meaning-in-bengali)
* [Anthology/Blackboard help (zh-CHS): 判断题 True/False question type, 对/错](https://help.anthology.com/blackboard/instructor/zh-CHS/assessments/questions/question-types/true-false-questions.html)
* [Blackboard help (ru-RU): Вопросы «верно/неверно» (True/False questions)](https://help.blackboard.com/ru-ru/Learn/Instructor/Tests_Pools_Surveys/Question_Types/True_or_False_Questions)
* [Wiktionary: 真偽 (shingi), "true or false; genuine or fake"](https://en.wiktionary.org/wiki/%E7%9C%9F%E5%81%BD)
* [JapanDict: 真 (shin)](https://www.japandict.com/%E7%9C%9F)
* [Jisho: 偽 kanji](https://jisho.org/search/%E5%81%BD%20%23kanji)
* [Cambridge Dictionary: "benar" (Indonesian-English)](https://dictionary.cambridge.org/dictionary/indonesian-english/benar)
* [bab.la: "salah" (Indonesian-English)](https://en.bab.la/dictionary/indonesian-english/salah)
* [Wikipedia: List of languages by total number of speakers (Ethnologue figures)](https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers)
* [Moodle 4.5 language packs](https://download.moodle.org/download.php/direct/langpack/4.5/) (am, ar, bn, de, es, fa, fil, fr, gu, ha, hi, id, it, ja, kn, ko, mr, ms, pcm, pl, pt, pt_br, ru, sw, ta, te, th, tl, tr, uk, ur, vi, yo, zh_cn, zh_tw). File `qtype_truefalse.php`. The source of the words of most rows.
* Vietnamese Đ/S in mathematics textbooks:
  [VietJack, Toán 4](https://vietjack.com/giai-vo-bai-tap-toan-4/bai-1-trang-89-vbt-toan-4-tap-2.jsp),
  [VietJack, Toán 10](https://vietjack.com/sbt-toan-10-kn/bai-1-35-trang-14-sbt-toan-lop-10-tap-1-ket-noi.jsp),
  [Loigiaihay](https://loigiaihay.com/bai-tap-283859.html)
* Indonesian B/S:
  [Kemdikbud, LMS SPADA](https://lmsspada.kemdikbud.go.id/mod/resource/view.php?id=107995),
  [Quipper, logika matematika](https://www.quipper.com/id/blog/masuk-ptn/sbmptn/matematika-sbmptn/matematika-dasar-logika-paling-mudah-ini-contoh-soal-dan-pembahasannya/)
* Turkish D/Y:
  [Ata Yayıncılık, 9. sınıf matematik](https://www.egitimsistem.com/9-sinif-matematik-ders-kitabi-cevaplari-sayfa-26-cevaplari-ata-yayincilik-102076h.htm),
  [TÜBİTAK Bilim Çocuk](https://bilimcocuk.tubitak.gov.tr/wp-content/uploads/sites/157/2025/09/b16a9924-f405-4493-ac19-979a05fb98ad.pdf)
* [Cebraspe C/E, TRF6 caderno](https://cdn.cebraspe.org.br/concursos/TRF6_24/arquivos/034_TRF6_CG1_01.PDF)
* [Korean O/X quiz, ZEP guide](https://docs.channel.io/zep-guide/ko/articles/OX-%ED%80%B4%EC%A6%88-b71e001e)
* Hausa:
  [kamus.com.ng, "true"](https://kamus.com.ng/true.html),
  [Hausa dictionary, "lie"](https://hausadictionary.com/lie),
  [UW-Madison LCTL resources](https://wisc.pb.unizin.org/lctlresources/?p=3065)
* Amharic, Persian, Vietnamese, Turkish and Korean (dictionary):
  [Wiktionary, "true"](https://en.wiktionary.org/wiki/true),
  [Wiktionary, "false"](https://en.wiktionary.org/wiki/false)

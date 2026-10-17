---
type: research
status: done
tags: [spec, true-false, locale]
relatedTo: [docs/annex/true-false-spellings.md, docs/question-types/true-false.md]
---

# Pesquisa: letras candidatas a TRUE/FALSE em true-false

Conjuntos atuais (`docs/question-types/true-false.md`): TRUE = `T V S 对 真`,
FALSE = `F 错 偽`, `X` reservado. Normalização: NFKC e depois lowercase ASCII.

Método:

- Ranking: Wikipedia, "List of languages by total number of speakers" (dados
  Ethnologue). Top 31 + Italiano (32º); Coreano já está (28º).
- Fonte principal das palavras: pacotes de idioma do Moodle 4.5
  (`https://download.moodle.org/download.php/direct/langpack/4.5/<code>.zip`),
  arquivo `qtype_truefalse.php` (strings `true`/`false` da questão
  verdadeiro/falso). Quando o pacote não tem essas strings, uso `correct`/
  `incorrect` ou `truefalse` de outro componente. Fonte marcada "Moodle <code>".
- Prática escolar (letras usadas em prova): busca em livros didáticos,
  provas e material oficial.
- "Romanização" = inicial da transliteração latina usual. Não é prática de
  prova, salvo quando a coluna "Convenção" diz o contrário.
- ⚠ = sem fonte boa (conhecimento geral ou dicionário apenas).

## 1. Idiomas

| # | Idioma | BCP 47 | Verdadeiro | Falso | 1º code point (V / F) | Romanização (V / F) | Convenção em prova | Fonte |
| - | ------ | ------ | ---------- | ----- | --------------------- | ------------------- | ------------------ | ----- |
| 1 | Inglês | en | true | false | t / f | T / F | T/F | Moodle en |
| 2 | Mandarim | zh (zh-Hans) | 对 (正确) | 错 (错误) | 对 / 错 | D (duì) / C (cuò) | 对/错, √/×, 是/否 | Moodle zh_cn (对/错); Blackboard zh-CHS |
| 3 | Hindi | hi | सही (सत्य) | गलत (असत्य) | स / ग | S (sahi) / G (galat) | सही/गलत | Moodle hi (सही/गलत) |
| 4 | Espanhol | es | verdadero (cierto) | falso | v / f | V / F | V/F | Moodle es |
| 5 | Árabe padrão | ar | صح (صحيح) | خطأ | ص / خ | S (sahh) / K (khata) | صح/خطأ, ✓/✗ | Moodle ar |
| 6 | Francês | fr | vrai | faux | v / f | V / F | V/F | Moodle fr |
| 7 | Bengali | bn | সত্য | মিথ্যা | স / ম | S (satya) / M (mithya) | সত্য/মিথ্যা; ঠিক/ভুল (thik/bhul) ⚠ | Moodle bn |
| 8 | Português | pt, pt-BR | verdadeiro (certo) | falso (errado) | v / f | V / F | V/F; C/E nas provas Cebraspe | Moodle pt, pt_br; cadernos Cebraspe |
| 9 | Indonésio | id | benar | salah | b / s | B / S | **B/S** | Moodle id; material Kemdikbud (lmsspada) |
| 10 | Urdu | ur | صحیح (سچ) | غلط (جھوٹ) | ص / غ | S (sahih) / G (ghalat) | صحیح/غلط | Moodle ur |
| 11 | Russo | ru | верно | неверно | в / н | V (verno) / N (neverno) | верно/неверно | Moodle ru; Blackboard ru-RU |
| 12 | Alemão | de | wahr | falsch | w / f | W / F | W/F ou R/F (richtig/falsch) ⚠ | Moodle de |
| 13 | Japonês | ja | ○ (正しい, 真) | × (誤り, 偽) | ○ (So) / × (Sm) | M (maru) / B (batsu) | **○/×** | Moodle ja (true = ○, false = ×) |
| 14 | Pidgin nigeriano | pcm | true | false (lie) | t / f | T / F | inglês ⚠ | Moodle pcm sem as strings ⚠ |
| 15 | Árabe egípcio | arz | صح | غلط | ص / غ | S (sahh) / G (ghalat) | escola usa árabe padrão ⚠ | sem fonte ⚠ |
| 16 | Marathi | mr | बरोबर | चूक | ब / च | B (barobar) / C (chuk) | बरोबर/चूक; खरे/खोटे ⚠ | Moodle mr |
| 17 | Vietnamita | vi | Đúng | Sai | Đ (U+0110) / S | D / S | **Đ/S** | Moodle vi; livros de Toán 4 e Toán 10 (VietJack, Loigiaihay) |
| 18 | Telugu | te | ఒప్పు | తప్పు | ఒ / త | O (oppu) / T (tappu) | ఒప్పు/తప్పు | Moodle te |
| 19 | Suaíli | sw | Kweli (Ndiyo) | Sio kweli (Hapana) | k / s | K / S | Kweli/Sio kweli | Moodle sw (as duas formas aparecem) |
| 20 | Hauçá | ha | gaskiya | ƙarya | g / ƙ (U+0199) | G / K | ⚠ | dicionário kamus.com.ng; curso UW-Madison ⚠ |
| 21 | Turco | tr | Doğru | Yanlış | d / y | D / Y | **D/Y** | Moodle tr; livros MEB/Ata, TÜBİTAK Bilim Çocuk |
| 22 | Panjabi ocidental | pnb (pa-Arab) | صحیح / ਸਹੀ | غلط / ਗਲਤ | ص, ਸ / غ, ਗ | S / G | ⚠ | sem fonte; Moodle sem pacote pa ⚠ |
| 23 | Tagalo (Filipino) | tl, fil | Tama | Mali | t / m | T / M | Tama/Mali | Moodle tl |
| 24 | Tâmil | ta | சரி | தவறு | ச / த | S (sari) / T (thavaru) | சரி/தவறு | Moodle ta (`truefalse` = சரி/தவறு) |
| 25 | Yue (Cantonês) | yue (zh-Hant-HK) | 對 | 錯 | 對 (U+5C0D) / 錯 (U+932F) | D (deoi) / C (co) | 對/錯, ✓/✗ ⚠ | sem fonte ⚠ |
| 26 | Wu | wuu | (escrita do mandarim) | | 对 / 错 | | igual ao mandarim ⚠ | sem fonte ⚠ |
| 27 | Persa | fa | صحیح (درست) | غلط (نادرست) | ص / غ | S / G (D / N) | صحیح/غلط | Moodle fa; Wiktionary "true" (dorost) |
| 28 | Coreano | ko | 참 (맞다) | 거짓 (틀리다) | 참 / 거 | C (cham) / G (geojit) | **O/X** | Moodle ko (참/거짓); guia ZEP de OX 퀴즈 |
| 29 | Amárico | am | እውነት | ሐሰት | እ / ሐ | E (ewnet) / H (hasset) | ⚠ | Wiktionary/kaikki (እውነት); ሐሰት sem fonte ⚠ |
| 30 | Tailandês | th | ถูก (จริง) | ผิด (เท็จ) | ถ / ผ | T (thuk) / P (phit) | ถูก/ผิด | Moodle th |
| 31 | Javanês | jv | bener | salah (luput) | b / s | B / S | escola usa indonésio ⚠ | sem fonte ⚠ |
| 32 | Italiano | it | Vero | Falso | v / f | V / F | V/F | Moodle it |
| — | Taiwan (mandarim tradicional) | zh-Hant-TW | 是 | 非 | 是 / 非 | S (shì) / F (fēi) | 是/非 ⚠ | Moodle zh_tw (true = 是, false = 非) |

Notas:

- Fora do top 32, mas citados abaixo: Gujarati (gu, Moodle: સાચું/ખોટું),
  Canarim (kn, Moodle `correct`/`incorrect`: ಸರಿ/ತಪ್ಪು), Polonês (pl, Moodle:
  Prawda/Fałsz), Ucraniano (uk, Moodle: Правильно/Неправильно), Malaio (ms,
  betul/salah ⚠).
- Hindi no Moodle usa सही/गलत, não सत्य/असत्य como está no anexo atual.
- Árabe no Moodle usa صح, não صحيح. Mesma inicial.

## 2. Candidatas

Critério: letra ainda fora de TRUE/FALSE, com uso como inicial de verdadeiro
ou falso em algum idioma da tabela. "Prática" = letra usada como marcador em
prova ou LMS. Hoje toda candidata está em WARNING (lida como verdadeiro, com
aviso).

### 2.1 Latinas

| Letra | Verdadeiro em | Falso em | Confundidores | Classe |
| ----- | ------------- | -------- | ------------- | ------ |
| D | tr Doğru (prática D/Y); fa dorost (rom.); zh duì (rom.); yue deoi (rom.) | nenhum | nenhum | **SAFE-TRUE** |
| Đ/đ (U+0110/0111) | vi Đúng (prática Đ/S) | nenhum | NFKC não leva Đ a D; lowercase ASCII não leva Đ a đ, é preciso listar as duas | **SAFE-TRUE** |
| B | id benar (prática B/S); mr barobar (Moodle); jv bener; ms betul ⚠ | bn bhul (rom., forma secundária, sem fonte ⚠); ja batsu (rom. de ×) | nenhum | **SAFE-TRUE** com ressalva: conflito só por romanização de forma secundária |
| M | ko 맞다 majda (rom., forma secundária); ja maru (rom. de ○) | tl Mali (Moodle); bn mithya (rom.) | nenhum | **SAFE-FALSE** com ressalva: maru e majda são romanizações que ninguém escreve como marcador |
| O | ko/ja O (prática O/X); te oppu (rom.) | nenhum | `O` vs `0`; o par O/X colide com `X` reservado | SAFE-TRUE, ver nota sobre O/X |
| E | am ewnet (rom. ⚠) | pt errado (prática C/E, Cebraspe) | tr evet = "sim" | **CONFLICT** (fraco) |
| C | pt certo (prática C/E); es cierto; ko cham (rom.) | zh cuò (rom. de 错, que já é FALSE); yue co; mr chuk (Moodle, rom.) | nenhum | **CONFLICT** |
| G | ha gaskiya (escrita latina nativa) | hi galat (Moodle); ur/fa/pnb ghalat (rom.); ko geojit (rom.); arz ghalat | tr gerçek = "real" | **CONFLICT** |
| K | sw Kweli (Moodle) | ha ƙarya (normalmente digitado com k); ar khata (rom.); gu khotu (rom.) | nenhum | **CONFLICT** |
| N | sw Ndiyo (Moodle sw `true`); te nijam (rom.) | ru неверно (rom.); fa nadorost (rom.) | en no, de nein, fr non = "não" | **CONFLICT** |
| W | de wahr (Moodle) | en wrong | nenhum | **CONFLICT** |
| Y | nenhum | tr Yanlış (prática D/Y) | en yes, id ya = "sim" | **CONFLICT** (confundidor) |
| P | pl Prawda (Moodle); ru/uk pravda, pravilno (rom.) | th phit (rom. de ผิด, Moodle th) | pt/es "pergunta" etc. não relevantes | **CONFLICT** (fraco, só romanização do lado falso) |
| H | nenhum | sw Hapana (Moodle sw `false`); am hasset (rom. ⚠) | hi haan = "sim"; tr hayır, tl hindi = "não" | **CONFLICT** (confundidor) |
| J | th jing (rom.) | ur jhoot (rom.) | de/nl ja = "sim" | **CONFLICT** (fraco) |
| A | nenhum | hi asatya, te abaddham (rom., formas fora de uso em prova) | `A` é a 1ª opção de múltipla escolha | WEAK |
| L | nenhum | ru lozh, pcm lie (rom. ⚠) | nenhum | WEAK |
| U | nenhum | sw uongo (rom. ⚠) | nenhum | WEAK |
| R | de richtig (prática R/F ⚠) | nenhum | nenhum | WEAK (sem fonte) |
| Ƙ/ƙ (U+0198/0199) | nenhum | ha ƙarya | nenhum | WEAK (sem fonte de prática) |

### 2.2 Escritas não latinas (todas `Lo`, salvo Cirílico `Lu`/`Ll`)

| Letra | Verdadeiro em | Falso em | Classe |
| ----- | ------------- | -------- | ------ |
| 對 U+5C0D | yue, zh-Hant (forma tradicional de 对) ⚠ | nenhum | SAFE-TRUE |
| 錯 U+932F | nenhum | yue, zh-Hant (forma tradicional de 错) ⚠ | SAFE-FALSE |
| 是 | zh_tw (Moodle) | nenhum | SAFE-TRUE |
| 非 | nenhum | zh_tw (Moodle) | SAFE-FALSE |
| 否 | nenhum | zh "não" (Moodle zh_cn `no`) | SAFE-FALSE |
| 正 | zh 正确, ja 正しい/正誤 ⚠ | nenhum | SAFE-TRUE |
| 误 / 誤 | nenhum | zh 错误, ja 誤り/正誤 ⚠ | SAFE-FALSE |
| 假, 伪, 僞 | nenhum | zh 真假, variantes de 偽 ⚠ | SAFE-FALSE |
| 참 | ko (Moodle) | nenhum | SAFE-TRUE |
| 거 | nenhum | ko 거짓 (Moodle) | SAFE-FALSE |
| В/в (Cirílico) | ru верно (Moodle) | nenhum | SAFE-TRUE (homóglifo de `B`, que também seria TRUE) |
| Н/н (Cirílico) | nenhum | ru неверно (Moodle) | SAFE-FALSE (homóglifo de `H`, que é CONFLICT/WARNING) |
| П/п (Cirílico) | uk Правильно (Moodle) | nenhum | SAFE-TRUE |
| ص | ar صح, ur/fa صحیح (Moodle) | nenhum | SAFE-TRUE |
| خ | nenhum | ar خطأ (Moodle) | SAFE-FALSE |
| غ | nenhum | ur/fa غلط (Moodle) | SAFE-FALSE |
| स | hi सही (Moodle) | nenhum | SAFE-TRUE |
| ग | nenhum | hi गलत (Moodle) | SAFE-FALSE |
| ब | mr बरोबर (Moodle) | nenhum | SAFE-TRUE |
| च | nenhum | mr चूक (Moodle) | SAFE-FALSE |
| ख | mr खरे ⚠ | mr खोटे ⚠ | CONFLICT (sem fonte) |
| ખ | gu ખરું ⚠ | gu ખોટું (Moodle) | CONFLICT (fraco) |
| স / ম | bn সত্য / মিথ্যা (Moodle) | | SAFE-TRUE / SAFE-FALSE |
| ఒ / త | te ఒప్పు / తప్పు (Moodle) | | SAFE-TRUE / SAFE-FALSE |
| ச / த | ta சரி / தவறு (Moodle) | | SAFE-TRUE / SAFE-FALSE |
| ಸ / ತ | kn ಸರಿ / ತಪ್ಪು (Moodle `correct`/`incorrect`) | | SAFE-TRUE / SAFE-FALSE |
| ถ / ผ | th ถูก / ผิด (Moodle) | | SAFE-TRUE / SAFE-FALSE |
| እ / ሐ | am እውነት / ሐሰት ⚠ | | SAFE-TRUE / SAFE-FALSE (fonte fraca) |

Observações:

- A regra de normalização faz só lowercase ASCII. Toda letra com caixa fora
  do ASCII (Đ, Cirílico, Ƙ) precisa aparecer nas duas caixas no terminal.
- As letras não latinas não têm evidência de uso como marcador `[x]` em
  prova. Os autores destas línguas usam a palavra inteira, ○/×, √/× ou O/X.
  Promover essas letras não custa nada, mas o ganho prático também é pequeno.

## 3. Conflitos dos conjuntos atuais

- 🐞 **S (TRUE).** É o conflito mais sério. Os argumentos a favor de TRUE
  (सत्य, সত্য, صحيح, سچ, 真) são todos romanizações: ninguém escreve `[S]`
  nesses idiomas. Já S como FALSE é prática real, em escrita latina nativa:
  - id: B/S em material escolar oficial (Kemdikbud) e em lógica ("B dan S").
  - vi: Đ/S em livros didáticos de matemática do 4º ao 10º ano.
  - jv, ms (salah) e sw (Sio kweli) também começam com S para falso.

  Indonésio (255 mi) + vietnamita (97 mi) somam mais de 350 mi de falantes em
  que `[S]` quer dizer falso. Hoje esses documentos invertem a resposta em
  silêncio, sem aviso, porque S é TRUE e não WARNING. A seção "Locale" manda
  o autor indonésio usar F, mas o autor vietnamita nem é citado.
- **T (TRUE).** Falso em te/kn tappu e ta thavaru, só por romanização. Em
  prática, T é verdadeiro (en, tl Tama, th thuk). Conflito fraco, manter.
- **C como romanização de 错 (FALSE).** Não é conflito do conjunto atual, mas
  impede promover C a TRUE para o padrão Cebraspe C/E.
- **V, F, 对, 真, 错, 偽.** Nenhum conflito achado. Cirílico В (verno) é
  homóglifo de B latino e os dois apontam para verdadeiro.
- **X reservado vs O/X.** Coreano e japonês usam O/X para verdadeiro/falso.
  Um autor coreano que escreve `[X]` para falso gera um item de múltipla
  seleção. Não é conflito de letra, mas é um risco que vale um lint ou nota.
- O texto atual da spec (linha 99) diz que S é inicial de "true" em árabe e
  urdu; vale para a romanização, mas a evidência de LMS mostra que S em
  escrita latina, onde é usado de fato, quer dizer falso.

## 4. Recomendação

- Promover a TRUE: `D`, `Đ`/`đ`, `B`. Os três têm prática real (tr D/Y,
  vi Đ/S, id B/S) e nenhum uso de falso fora de romanização secundária.
- Promover a FALSE: `M` (tl Mali, bn mithya). Ressalva fraca: ja maru e
  ko majda.
- Não promover: `C`, `E`, `G`, `K`, `N`, `W`, `Y`, `P`, `H`, `J`. Ficam em
  WARNING. Em especial, o par Cebraspe C/E não tem solução limpa por causa de
  cuò (错).
- `O`: tecnicamente SAFE-TRUE, mas só faz sentido com o par O/X, que colide
  com `X`. Deixar em WARNING.
- Escritas não latinas: opcional. Se for fazer, só as de fonte LMS:
  對, 錯, 是, 非, 참, 거, В/в, Н/н, ص, خ, غ, स, ग. Ganho prático baixo.
- 🟡 Decisão em aberto: tirar `S` de TRUE e deixar em WARNING. Com isso,
  documentos id/vi/jv que usam `[S]` passam a gerar aviso em vez de inverter
  a resposta em silêncio. Mover S para FALSE também é defensável pela
  evidência de prática, mas é uma mudança de sentido incompatível.

## Fontes

- Wikipedia, List of languages by total number of speakers:
  https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers
- Pacotes de idioma do Moodle 4.5 (am, ar, bn, de, es, fa, fil, fr, gu, ha,
  hi, id, it, ja, kn, ko, mr, ms, pcm, pl, pt, pt_br, ru, sw, ta, te, th, tl,
  tr, uk, ur, vi, yo, zh_cn, zh_tw):
  https://download.moodle.org/download.php/direct/langpack/4.5/
- Blackboard (zh-CHS, ru-RU): links já citados no anexo.
- Vietnamita Đ/S: https://vietjack.com/giai-vo-bai-tap-toan-4/bai-1-trang-89-vbt-toan-4-tap-2.jsp,
  https://vietjack.com/sbt-toan-10-kn/bai-1-35-trang-14-sbt-toan-lop-10-tap-1-ket-noi.jsp,
  https://loigiaihay.com/bai-tap-283859.html
- Indonésio B/S: https://lmsspada.kemdikbud.go.id/mod/resource/view.php?id=107995,
  https://www.quipper.com/id/blog/masuk-ptn/sbmptn/matematika-sbmptn/matematika-dasar-logika-paling-mudah-ini-contoh-soal-dan-pembahasannya/
- Turco D/Y: https://www.egitimsistem.com/9-sinif-matematik-ders-kitabi-cevaplari-sayfa-26-cevaplari-ata-yayincilik-102076h.htm,
  https://bilimcocuk.tubitak.gov.tr/wp-content/uploads/sites/157/2025/09/b16a9924-f405-4493-ac19-979a05fb98ad.pdf
- Cebraspe C/E: https://cdn.cebraspe.org.br/concursos/TRF6_24/arquivos/034_TRF6_CG1_01.PDF
- Coreano O/X: https://docs.channel.io/zep-guide/ko/articles/OX-%ED%80%B4%EC%A6%88-b71e001e
- Hauçá: https://kamus.com.ng/true.html, https://hausadictionary.com/lie,
  https://wisc.pb.unizin.org/lctlresources/?p=3065
- Amárico, persa, vietnamita, turco, coreano (dicionário):
  https://en.wiktionary.org/wiki/true, https://en.wiktionary.org/wiki/false

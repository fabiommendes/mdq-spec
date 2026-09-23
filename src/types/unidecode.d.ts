/**
 * `unidecode` ships no types. It is a port of Perl's Text::Unidecode, the
 * same table `python-slugify` transliterates with, which is why both
 * implementations agree on the slug of any given text.
 */
declare module "unidecode" {
	export default function unidecode(text: string): string;
}

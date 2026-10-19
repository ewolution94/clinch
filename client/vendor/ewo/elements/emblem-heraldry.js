//#region packages/elements/src/emblem-heraldry.ts
var e = [
	[{
		de: "Mond",
		en: "Crescent"
	}, "M62 22A30 30 0 1 0 62 78A24 24 0 1 1 62 22Z"],
	[{
		de: "Stern",
		en: "Star"
	}, "M50 18L58 41L82 41L63 55L70 79L50 64L30 79L37 55L18 41L42 41Z"],
	[{
		de: "Turm",
		en: "Tower"
	}, "M30 80V38H36V30H44V38H48V30H56V38H60V30H68V38H70V80H57V62A7 7 0 0 0 43 62V80Z"],
	[{
		de: "Schlüssel",
		en: "Key"
	}, "M34 30A12 12 0 1 1 34 54A12 12 0 1 1 34 30ZM34 37A5 5 0 1 0 34 47A5 5 0 1 0 34 37ZM44 39H80V45H74V53H68V45H62V51H56V45H44Z"],
	[{
		de: "Krone",
		en: "Crown"
	}, "M24 70L20 34L36 50L50 26L64 50L80 34L76 70Z"],
	[{
		de: "Fisch",
		en: "Fish"
	}, "M18 50C30 32 56 30 70 46L84 34V66L70 54C56 70 30 68 18 50ZM32 46A3 3 0 1 0 32 52A3 3 0 1 0 32 46Z"],
	[{
		de: "Vogel",
		en: "Bird"
	}, "M20 56C32 50 40 38 52 38C60 38 64 42 68 46L82 44L72 52C70 64 58 72 44 72C34 72 26 66 20 56ZM58 44A3 3 0 1 0 58 50A3 3 0 1 0 58 44Z"],
	[{
		de: "Baum",
		en: "Tree"
	}, "M46 84V64C32 64 22 54 24 42C26 30 36 24 44 26C46 18 58 16 64 24C74 24 80 34 76 44C80 56 68 66 54 64V84Z"],
	[{
		de: "Schwert",
		en: "Sword"
	}, "M47 16H53V60H66V66H53V76H57V84H43V76H47V66H34V60H47Z"],
	[{
		de: "Kelch",
		en: "Chalice"
	}, "M28 22H72C72 44 62 54 54 56V70H64V78H36V70H46V56C38 54 28 44 28 22Z"],
	[{
		de: "Rad",
		en: "Wheel"
	}, "M50 20A30 30 0 1 1 50 80A30 30 0 1 1 50 20ZM50 30A20 20 0 1 0 50 70A20 20 0 1 0 50 30ZM47 30H53V70H47ZM30 47H70V53H30Z"],
	[{
		de: "Glocke",
		en: "Bell"
	}, "M50 18C56 18 58 22 58 26C68 30 72 42 72 56C72 64 78 68 82 72H18C22 68 28 64 28 56C28 42 32 30 42 26C42 22 44 18 50 18ZM44 76H56A6 6 0 0 1 44 76Z"],
	[{
		de: "Hufeisen",
		en: "Horseshoe"
	}, "M28 26H40V54A10 10 0 0 0 60 54V26H72V54A22 22 0 0 1 28 54Z"],
	[{
		de: "Axt",
		en: "Axe"
	}, "M46 16H52V84H46ZM52 22C66 22 78 32 80 46C72 42 62 44 52 48Z"],
	[{
		de: "Pilz",
		en: "Mushroom"
	}, "M18 52C18 32 34 22 50 22C66 22 82 32 82 52ZM42 52H58L62 80H38Z"],
	[{
		de: "Rose",
		en: "Rose"
	}, "M50 20C58 20 62 28 60 36C68 32 78 38 76 46C82 52 78 62 70 62C72 70 64 78 56 74C52 82 40 82 38 74C30 78 22 70 26 62C18 62 14 52 20 46C18 38 28 32 36 36C34 28 42 20 50 20ZM50 42A8 8 0 1 0 50 58A8 8 0 1 0 50 42Z"]
], t = "M8 6H92V44C92 72 72 88 50 96C28 88 8 72 8 44Z", n = "<path d=\"M20 18L80 82M80 18L20 82\" class=\"strike\"/>", r = e.map(([e]) => e), i = [
	[{
		de: "Tinte",
		en: "Ink"
	}, "<rect width=\"100\" height=\"100\" class=\"e1\"/>"],
	[{
		de: "Farbe",
		en: "Colour"
	}, "<rect width=\"100\" height=\"100\" class=\"e2\"/>"],
	[{
		de: "Gespalten",
		en: "Per pale"
	}, "<rect width=\"100\" height=\"100\" class=\"e3\"/><rect width=\"50\" height=\"100\" class=\"e1\"/>"],
	[{
		de: "Geteilt",
		en: "Per fess"
	}, "<rect width=\"100\" height=\"100\" class=\"e1\"/><rect width=\"100\" height=\"48\" class=\"e2\"/>"],
	[{
		de: "Schräg geteilt",
		en: "Per bend"
	}, "<rect width=\"100\" height=\"100\" class=\"e2\"/><path d=\"M0 0H100L0 100Z\" class=\"e1\"/>"],
	[{
		de: "Geviert",
		en: "Quarterly"
	}, "<rect width=\"100\" height=\"100\" class=\"e3\"/><path d=\"M0 0H50V50H100V100H50V50H0Z\" class=\"e1\"/>"],
	[{
		de: "Bord",
		en: "Bordure"
	}, "<rect width=\"100\" height=\"100\" class=\"e1\"/><path d=\"M18 16H82V44C82 64 68 76 50 84C32 76 18 64 18 44Z\" class=\"e3\"/>"],
	[{
		de: "Berg",
		en: "Mount"
	}, "<rect width=\"100\" height=\"100\" class=\"e1\"/><path d=\"M0 74L50 34L100 74V100H0Z\" class=\"e2\"/>"]
], a = {
	id: "heraldry",
	parts: [{
		name: {
			de: "Feld",
			en: "Field"
		},
		options: i.map(([e]) => e)
	}, {
		name: {
			de: "Figur",
			en: "Charge"
		},
		options: r
	}],
	svg([r, a], { uid: o = "e", dead: s = !1 } = {}) {
		return `<svg viewBox="0 0 100 100" class="heraldry" aria-hidden="true"><defs><clipPath id="s${o}"><path d="${t}"/></clipPath></defs><g${s ? " class=\"faded\"" : ""}><g clip-path="url(#s${o})">${i[r]?.[1] ?? i[0][1]}<path class="charge" d="${e[a]?.[1] ?? e[0][1]}" transform="translate(50 52) scale(0.62) translate(-50 -50)"/></g><path d="${t}" class="rim"/></g>${s ? n : ""}</svg>`;
	},
	fromSeed: (e) => [(e >>> 7) % 8, e % 16]
}, o = [
	[
		{
			de: "Indigo & Gold",
			en: "Indigo & gold"
		},
		"#232a6e",
		"#ffd23f"
	],
	[
		{
			de: "Karmin & Rosé",
			en: "Crimson & blush"
		},
		"#a3123f",
		"#ffd6e2"
	],
	[
		{
			de: "Tanne & Minze",
			en: "Pine & mint"
		},
		"#0f5246",
		"#b5ecd3"
	],
	[
		{
			de: "Blau & Eis",
			en: "Blue & ice"
		},
		"#2148b8",
		"#d6e4ff"
	],
	[
		{
			de: "Violett & Flieder",
			en: "Violet & lilac"
		},
		"#5b2a9e",
		"#e7d9ff"
	],
	[
		{
			de: "Rot & Creme",
			en: "Red & cream"
		},
		"#c8351f",
		"#fff0d1"
	],
	[
		{
			de: "Tinte & Papier",
			en: "Ink & paper"
		},
		"#1b1b1f",
		"#ecebe6"
	],
	[
		{
			de: "Bernstein & Butter",
			en: "Amber & butter"
		},
		"#9a4f00",
		"#ffeaa8"
	]
], s = [
	[{
		de: "Dunkel",
		en: "Dark"
	}, (e) => `<rect width="100" height="100" fill="${e}"/>`],
	[{
		de: "Hell",
		en: "Light"
	}, (e, t) => `<rect width="100" height="100" fill="${t}"/><circle cx="50" cy="50" r="40" fill="none" stroke="${e}" stroke-width="2.5"/>`],
	[{
		de: "Gespalten",
		en: "Per pale"
	}, (e, t) => `<rect width="100" height="100" fill="${t}"/><rect width="50" height="100" fill="${e}"/>`],
	[{
		de: "Geteilt",
		en: "Per fess"
	}, (e, t) => `<rect width="100" height="100" fill="${e}"/><rect width="100" height="50" fill="${t}"/>`],
	[{
		de: "Schräg geteilt",
		en: "Per bend"
	}, (e, t) => `<rect width="100" height="100" fill="${t}"/><path d="M0 0H100L0 100Z" fill="${e}"/>`],
	[{
		de: "Geviert",
		en: "Quarterly"
	}, (e, t) => `<rect width="100" height="100" fill="${t}"/><path d="M0 0H50V50H100V100H50V50H0Z" fill="${e}"/>`],
	[{
		de: "Ring",
		en: "Annulet"
	}, (e, t) => `<rect width="100" height="100" fill="${e}"/><circle cx="50" cy="50" r="34" fill="${t}"/>`],
	[{
		de: "Streifen",
		en: "Bars"
	}, (e, t) => `<rect width="100" height="100" fill="${e}"/><path d="M0 22H100V34H0ZM0 44H100V56H0ZM0 66H100V78H0Z" fill="${t}"/>`]
], c = {
	id: "token",
	parts: [
		{
			name: {
				de: "Farben",
				en: "Colours"
			},
			options: o.map(([e]) => e)
		},
		{
			name: {
				de: "Teilung",
				en: "Division"
			},
			options: s.map(([e]) => e)
		},
		{
			name: {
				de: "Figur",
				en: "Charge"
			},
			options: r
		}
	],
	svg([t, r, i], { uid: a = "e", dead: c = !1 } = {}) {
		let [, l, u] = o[t] ?? o[0], d = (s[r] ?? s[0])[1](l, u);
		return `<svg viewBox="0 0 100 100" class="token" aria-hidden="true"><defs><clipPath id="r${a}"><circle cx="50" cy="50" r="46"/></clipPath></defs><g${c ? " class=\"faded\"" : ""}><g clip-path="url(#r${a})">${d}<path d="${e[i]?.[1] ?? e[0][1]}" transform="translate(50 50) scale(0.6) translate(-50 -50)" fill="#fffdf6" stroke="${l}" stroke-width="5" stroke-linejoin="round" paint-order="stroke"/></g><circle cx="50" cy="50" r="46" fill="none" stroke="${l}" stroke-width="4"/></g>${c ? n : ""}</svg>`;
	},
	fromSeed: (e) => [
		(e >>> 4) % 8,
		(e >>> 7) % 8,
		e % 16
	]
};
//#endregion
export { e as CHARGES, a as heraldry, c as token };

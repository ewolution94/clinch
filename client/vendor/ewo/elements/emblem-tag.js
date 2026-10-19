import { CHARGES as e } from "./emblem-heraldry.js";
//#region packages/elements/src/emblem-tag.ts
var t = "M34 14H84a8 8 0 0 1 8 8V78a8 8 0 0 1-8 8H34L11 54Q8 50 11 46Z", n = [
	[
		{
			de: "Tasche",
			en: "Bag"
		},
		"M24 38H76L71 84H29Z",
		"M38 44V32A12 12 0 0 1 62 32V44"
	],
	[
		{
			de: "Geschenk",
			en: "Gift"
		},
		"M20 38H80V54H20ZM25 54H75V84H25Z",
		"M50 38V84M50 38C44 24 28 24 31 33C33 38 44 38 50 38C56 38 67 38 69 33C72 24 56 24 50 38"
	],
	[
		{
			de: "Edelstein",
			en: "Gem"
		},
		"M30 24H70L86 42L50 84L14 42Z",
		"M14 42H86M38 24L33 42L50 84L67 42L62 24"
	],
	[
		{
			de: "Münze",
			en: "Coin"
		},
		"M50 16A34 34 0 1 1 50 84A34 34 0 1 1 50 16Z",
		"M63 37A15 15 0 1 0 63 63M32 46H54M32 55H54"
	],
	[
		{
			de: "Einkaufswagen",
			en: "Cart"
		},
		"M28 32H84L76 62H36Z",
		"M12 22H25L38 70H78M37 80a5 5 0 1 0 10 0a5 5 0 1 0-10 0M67 80a5 5 0 1 0 10 0a5 5 0 1 0-10 0"
	],
	[{
		de: "Prozent",
		en: "Percent"
	}, "M32 20A11 11 0 1 1 32 42A11 11 0 1 1 32 20ZM68 58A11 11 0 1 1 68 80A11 11 0 1 1 68 58ZM70 16L80 24L30 84L20 76Z"]
], r = [
	[{
		de: "Mint",
		en: "Mint"
	}, "#64c8b9"],
	[{
		de: "Lila",
		en: "Purple"
	}, "#b198db"],
	[{
		de: "Orange",
		en: "Orange"
	}, "#f8a171"],
	[{
		de: "Blau",
		en: "Blue"
	}, "#6ea0eb"],
	[{
		de: "Rosa",
		en: "Pink"
	}, "#e89fdd"],
	[{
		de: "Grün",
		en: "Green"
	}, "#a9e034"],
	[{
		de: "Gelb",
		en: "Yellow"
	}, "#f5d547"],
	[{
		de: "Beige",
		en: "Beige"
	}, "#d8bda4"],
	[{
		de: "Petrol",
		en: "Teal"
	}, "#099f91"],
	[{
		de: "Pflaume",
		en: "Plum"
	}, "#9c7fcb"]
], i = [
	[{
		de: "Schlicht",
		en: "Plain"
	}, ""],
	[{
		de: "Schräg",
		en: "Diagonal"
	}, "<path class=\"tp\" d=\"M0 0H100L0 100Z\"/>"],
	[{
		de: "Halbiert",
		en: "Halves"
	}, "<rect class=\"tp\" width=\"100\" height=\"50\"/>"],
	[{
		de: "Geviert",
		en: "Quarters"
	}, "<path class=\"tp\" d=\"M0 0H62V50H100V100H62V50H0Z\"/>"],
	[{
		de: "Rand",
		en: "Border"
	}, `<path class="tb" d="${t}"/>`],
	[{
		de: "Streifen",
		en: "Stripes"
	}, "<path class=\"tp\" d=\"M0 26H100V36H0ZM0 45H100V55H0ZM0 64H100V74H0Z\"/>"],
	[{
		de: "Punkte",
		en: "Dots"
	}, [
		44,
		62,
		80
	].flatMap((e) => [
		30,
		50,
		70
	].map((t) => `<circle class="tp" cx="${e}" cy="${t}" r="5.5"/>`)).join("")],
	[{
		de: "Sparren",
		en: "Chevron"
	}, "<path class=\"tp\" d=\"M0 76L62 46L100 64V100H0Z\"/>"]
], a = [
	{
		de: "Anfangsbuchstabe",
		en: "Initial"
	},
	...n.map(([e]) => e),
	...e.map(([e]) => e)
], o = "translate(62 50) scale(0.54) translate(-50 -50)", s = (e) => e.replace(/[&<>"]/g, (e) => `&#${e.charCodeAt(0)};`), c = {
	id: "tag",
	parts: [
		{
			name: {
				de: "Farbe",
				en: "Colour"
			},
			options: r.map(([e]) => e)
		},
		{
			name: {
				de: "Muster",
				en: "Pattern"
			},
			options: i.map(([e]) => e)
		},
		{
			name: {
				de: "Figur",
				en: "Figure"
			},
			options: a
		}
	],
	svg([r, a, c], { uid: l = "e", dead: u = !1, initial: d = "" } = {}) {
		let f;
		if (!c) f = `<text class="ti" x="62" y="51" text-anchor="middle" dominant-baseline="central">${s([...new Intl.Segmenter(void 0, { granularity: "grapheme" }).segment(d.trim())][0]?.segment.toUpperCase() ?? "?")}</text>`;
		else if (c <= n.length) {
			let [, e, t] = n[c - 1];
			f = `<g transform="${o}"><path class="tf" d="${e}"/>${t ? `<path class="tl" d="${t}"/>` : ""}</g>`;
		} else f = `<path class="tf" d="${e[c - 1 - n.length]?.[1] ?? e[0][1]}" transform="${o}"/>`;
		return `<svg viewBox="0 0 100 100" class="tag" aria-hidden="true"><g class="tc${r}${u ? " faded" : ""}" transform="rotate(-12 50 50) translate(50 50) scale(0.92) translate(-50 -50)"><defs><clipPath id="g${l}"><path d="${t}"/></clipPath></defs><g clip-path="url(#g${l})"><rect class="e1" width="100" height="100"/>${(i[a] ?? i[0])[1]}</g><path class="trim" d="${t}"/><circle class="thole" cx="24" cy="50" r="5.5"/>${f}</g>${u ? "<path d=\"M20 18L80 82M80 18L20 82\" class=\"strike\"/>" : ""}</svg>`;
	},
	fromSeed: (e) => [
		(e >>> 4) % r.length,
		(e >>> 7) % 8,
		1 + n.length + e % 16
	]
};
//#endregion
export { r as TAG_COLOURS, c as tag };

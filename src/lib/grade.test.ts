import { test } from "node:test";
import assert from "node:assert/strict";
import { grade } from "./grade.ts";

const v = (input: string, expected: string, opts = {}) => grade(input, expected, opts).verdict;

test("exact and normalization", () => {
  assert.equal(v("Hola", "hola"), "correct");
  assert.equal(v("  ¿Qué tal?  ", "¿qué tal?"), "correct");
  assert.equal(v("buenos dias", "buenos días"), "accent");
});

test("accents and special letters", () => {
  assert.equal(v("manana", "mañana"), "accent");
  assert.equal(v("czesc", "cześć"), "accent");
  assert.equal(v("dziekuje", "dziękuję"), "accent");
  assert.equal(v("lza", "łza"), "accent");
});

test("typos", () => {
  assert.equal(v("hloa", "hola"), "typo");
  assert.equal(v("gracais", "gracias"), "typo");
  assert.equal(v("hils", "hola"), "wrong");
  assert.equal(v("gato", "pato"), "wrong");
  assert.equal(v("perrp", "perro"), "typo"); // o→p adjacent
  assert.equal(v("si", "sí"), "accent");
  assert.equal(v("no", "yo"), "wrong");
});

test("strictness", () => {
  assert.equal(v("hloa", "hola", { strictness: "strict" }), "wrong");
  assert.equal(v("manana", "mañana", { strictness: "strict" }), "accent");
});

test("articles", () => {
  const r = grade("perro", "el perro", { lang: "es" });
  assert.equal(r.verdict, "correct");
  assert.equal(r.missingArticle, true);
  assert.equal(v("el perro", "el perro"), "correct");
  assert.equal(v("la perro", "el perro", { lang: "es" }), "wrong");
});

test("alternatives", () => {
  assert.equal(v("hej", "cześć", { alts: ["hej"] }), "correct");
  assert.equal(v("dobry wieczór", "dobry wieczór / dobranoc"), "correct");
  assert.equal(v("dobranoc", "dobry wieczór; dobranoc"), "correct");
  assert.equal(v("francesa", "francés / francesa"), "correct");
  assert.equal(v("alta", "alto/a"), "correct");
  assert.equal(v("profesora", "profesor/a"), "correct");
  assert.equal(v("la estudiante", "el/la estudiante"), "correct");
  assert.equal(v("uczyć", "(się) uczyć"), "correct");
  assert.equal(v("się uczyć", "(się) uczyć"), "correct");
});

test("commas are part of a phrase", () => {
  assert.equal(v("puedes repetir por favor", "¿Puedes repetir, por favor?"), "correct");
  assert.equal(v("por favor", "¿Puedes repetir, por favor?"), "wrong");
  assert.equal(v("entiendo", "No, no entiendo."), "wrong");
});

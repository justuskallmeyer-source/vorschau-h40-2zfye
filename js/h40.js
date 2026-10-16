/* H40 Kinder- und Jugendhaus Cronenberg
   Offen-Status, Sprühwand, Lightbox, Dingeschrank, Menü.
   Daten (Öffnungszeiten, Schließzeiten) kommen aus /js/daten.js */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var D = window.H40 || { zeiten: {}, zu: [], sonder: {} };
  var WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  var WT_LANG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Datum-Helfer ---------- */
  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function kurz(d) {
    return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + ".";
  }
  function ausIso(s) {
    var p = s.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function uhr(t) {
    return t[1] ? t[0] + "." + String(t[1]).padStart(2, "0") : String(t[0]);
  }
  function schliessung(d) {
    var s = iso(d);
    for (var i = 0; i < D.zu.length; i++) {
      if (s >= D.zu[i].von && s <= D.zu[i].bis) return D.zu[i];
    }
    return null;
  }
  function oeffnung(d) {
    var s = iso(d);
    if (D.sonder[s]) return D.sonder[s];
    if (schliessung(d)) return null;
    return D.zeiten[d.getDay()] || null;
  }
  function minuten(t) { return t[0] * 60 + (t[1] || 0); }
  function naechsteOeffnung(ab) {
    var d = new Date(ab.getFullYear(), ab.getMonth(), ab.getDate());
    for (var i = 0; i < 120; i++) {
      d.setDate(d.getDate() + 1);
      var o = oeffnung(d);
      if (o) return { tag: new Date(d), o: o };
    }
    return null;
  }

  /* ---------- Offen-Status ---------- */
  function statusSetzen() {
    var jetzt = new Date();
    var heute = oeffnung(jetzt);
    var min = jetzt.getHours() * 60 + jetzt.getMinutes();
    var zuGrund = schliessung(jetzt);
    var kurzText, langText, titel, wann, was, offen = false;

    if (heute && min < minuten(heute.bis) ) {
      if (min >= minuten(heute.von)) {
        offen = true;
        kurzText = "Jetzt offen";
        langText = "bis " + uhr(heute.bis) + " Uhr";
        titel = "Jetzt gerade";
        wann = "Offen bis " + uhr(heute.bis) + " Uhr";
      } else {
        kurzText = "Heute ab " + uhr(heute.von) + " Uhr";
        langText = "";
        titel = "Heute, " + WT_LANG[jetzt.getDay()];
        wann = uhr(heute.von) + "–" + uhr(heute.bis) + " Uhr";
      }
      was = heute.was;
    } else {
      var n = naechsteOeffnung(jetzt);
      var morgen = new Date(jetzt); morgen.setDate(morgen.getDate() + 1);
      if (n) {
        var istMorgen = iso(n.tag) === iso(morgen);
        kurzText = istMorgen ? "Morgen ab " + uhr(n.o.von) + " Uhr" : "Wieder offen " + WT[n.tag.getDay()] + " " + kurz(n.tag);
        langText = "";
        titel = istMorgen ? "Morgen, " + WT_LANG[n.tag.getDay()] : "Nächste Offene Tür";
        wann = (istMorgen ? "" : WT[n.tag.getDay()] + " " + kurz(n.tag) + " · ") + uhr(n.o.von) + "–" + uhr(n.o.bis) + " Uhr";
        was = zuGrund ? zuGrund.was + ": Heute bleibt das H40 zu. " + n.o.was : n.o.was;
      } else {
        kurzText = "Zeiten im Programm"; titel = "Öffnungszeiten"; wann = "siehe Programm"; was = "";
      }
    }

    document.querySelectorAll("[data-status]").forEach(function (el) {
      el.classList.toggle("ist-offen", offen);
      el.classList.toggle("ist-zu", !offen);
      var t = el.querySelector(".status__text");
      var l = el.querySelector(".status__text-lang");
      if (t) t.textContent = kurzText;
      if (l) l.textContent = langText ? " · " + langText : "";
    });
    var h;
    if ((h = document.querySelector("[data-heute-titel]"))) h.textContent = titel;
    if ((h = document.querySelector("[data-heute-wann]"))) h.textContent = wann;
    if ((h = document.querySelector("[data-heute-was]"))) h.textContent = was;
  }

  function heuteMarkieren() {
    var jetzt = new Date();
    var s = iso(jetzt);
    document.querySelectorAll('.tag[data-wt="' + jetzt.getDay() + '"]').forEach(function (el) {
      if (!schliessung(jetzt)) el.classList.add("ist-heute");
    });
    document.querySelectorAll('[data-datum="' + s + '"]').forEach(function (el) { el.classList.add("ist-heute"); });

    // Hinweis auf aktuelle oder bald beginnende Schließzeit
    var hinweis = document.querySelector("[data-ferien-hinweis]");
    var bald = null;
    for (var i = 0; i < D.zu.length; i++) {
      var z = D.zu[i];
      var tageBis = (ausIso(z.von) - new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate())) / 864e5;
      if (s <= z.bis && tageBis <= 10) { bald = z; break; }
    }
    if (bald) {
      var ende = ausIso(bald.bis);
      var n = naechsteOeffnung(ende);
      var text = bald.von === bald.bis
        ? bald.was + ": Am " + kurz(ausIso(bald.von)) + " bleibt das H40 zu."
        : bald.was + ": Vom " + kurz(ausIso(bald.von)) + " bis " + kurz(ende) + " bleibt das H40 zu.";
      if (n) text += " Ab " + WT[n.tag.getDay()] + " " + kurz(n.tag) + " sind wir wieder für euch da!";
      if (hinweis) {
        hinweis.querySelector("span").textContent = text;
        hinweis.classList.add("ist-aktiv");
      }
      document.querySelectorAll('tr[data-von="' + bald.von + '"]').forEach(function (tr) { tr.classList.add("ist-aktuell"); });
    }
  }

  /* ---------- Menü ---------- */
  function menue() {
    var b = document.querySelector(".burger");
    if (!b) return;
    b.addEventListener("click", function () {
      var auf = document.body.classList.toggle("menue-offen");
      b.setAttribute("aria-expanded", auf ? "true" : "false");
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () { document.body.classList.remove("menue-offen"); });
    });
  }

  /* ---------- Einblenden ---------- */
  function einblenden() {
    var els = document.querySelectorAll(".rein, .rein-gruppe");
    if (!("IntersectionObserver" in window) || ruhig) {
      els.forEach(function (e) { e.classList.add("sichtbar"); });
      return;
    }
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("sichtbar"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- Lightbox ---------- */
  function lightbox() {
    var knoepfe = document.querySelectorAll("[data-gross]");
    if (!knoepfe.length) return;
    var dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    dlg.innerHTML = '<img alt=""><button type="button" aria-label="Schließen">✕</button>';
    document.body.appendChild(dlg);
    var img = dlg.querySelector("img");
    dlg.querySelector("button").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    knoepfe.forEach(function (k) {
      k.addEventListener("click", function () {
        img.src = k.getAttribute("data-gross");
        img.alt = k.getAttribute("data-alt") || "";
        if (dlg.showModal) dlg.showModal(); else window.open(img.src);
      });
    });
  }

  /* ---------- Dingeschrank ---------- */
  function schrank() {
    var s = document.querySelector(".schrank");
    if (!s) return;
    s.querySelectorAll(".schrank__tuer").forEach(function (t) {
      t.addEventListener("click", function () { s.classList.toggle("ist-offen"); });
    });
    if (!("IntersectionObserver" in window) || ruhig) { s.classList.add("ist-offen"); return; }
    var io = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) {
        setTimeout(function () { s.classList.add("ist-offen"); }, 450);
        io.disconnect();
      }
    }, { threshold: 0.55 });
    io.observe(s);
  }

  /* ---------- IBAN kopieren ---------- */
  function iban() {
    document.querySelectorAll("[data-kopieren]").forEach(function (b) {
      b.addEventListener("click", function () {
        var text = b.getAttribute("data-kopieren");
        var fertig = function () {
          var alt = b.textContent; b.textContent = "Kopiert!";
          setTimeout(function () { b.textContent = alt; }, 1600);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(fertig);
      });
    });
  }

  /* ---------- Sprühwand ---------- */
  function spruehwand() {
    var wand = document.querySelector(".wand");
    var cv = wand && wand.querySelector(".wand__farbe");
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var farbe = "#ff7eb6";
    var aktiv = false, x = 0, y = 0, lx = 0, ly = 0, still = 0, tropfen = [], laeuft = false;
    var R = 26;

    function groesse() {
      var r = wand.getBoundingClientRect();
      var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (cv.width === w && cv.height === h) return;
      var alt = null;
      if (cv.width && cv.height) {
        alt = document.createElement("canvas");
        alt.width = cv.width; alt.height = cv.height;
        alt.getContext("2d").drawImage(cv, 0, 0);
      }
      cv.width = w; cv.height = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (alt) ctx.drawImage(alt, 0, 0, alt.width / dpr, alt.height / dpr);
    }
    groesse();
    window.addEventListener("resize", groesse);

    function rgba(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    function spruehen(px, py, f, r) {
      r = r || R;
      var g = ctx.createRadialGradient(px, py, 0, px, py, r * 0.75);
      g.addColorStop(0, rgba(f, 0.2));
      g.addColorStop(1, rgba(f, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, r * 0.75, 0, 6.2832); ctx.fill();
      ctx.fillStyle = f;
      for (var i = 0; i < 46; i++) {
        var a = Math.random() * 6.2832;
        var d = r * Math.pow(Math.random(), 0.75);
        var s = Math.random() * 1.7 + 0.5;
        ctx.globalAlpha = 0.25 + Math.random() * 0.55;
        ctx.fillRect(px + Math.cos(a) * d, py + Math.sin(a) * d, s, s);
      }
      ctx.globalAlpha = 1;
    }
    function linie(x1, y1, x2, y2, f, r) {
      var dist = Math.hypot(x2 - x1, y2 - y1);
      var n = Math.max(1, Math.ceil(dist / 5));
      for (var i = 1; i <= n; i++) spruehen(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, f, r);
    }
    function tropfenStarten(px, py, f) {
      tropfen.push({ x: px + (Math.random() - 0.5) * R * 0.6, y: py + R * 0.25, v: 1.6 + Math.random(), rest: 40 + Math.random() * 110, b: 2.5 + Math.random() * 2.5, f: f });
    }
    function schleife() {
      if (aktiv) {
        spruehen(x, y, farbe);
        if (Math.hypot(x - lx, y - ly) < 6) {
          still++;
          if (still > 34 && Math.random() < 0.06 && tropfen.length < 30) tropfenStarten(x, y, farbe);
        } else still = 0;
        lx = x; ly = y;
      }
      for (var i = tropfen.length - 1; i >= 0; i--) {
        var t = tropfen[i];
        var schritt = Math.min(t.v, t.rest);
        ctx.fillStyle = rgba(t.f, 0.9);
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(t.x - t.b / 2, t.y, t.b, schritt + t.b / 2, t.b / 2) : ctx.rect(t.x - t.b / 2, t.y, t.b, schritt);
        ctx.fill();
        t.y += schritt; t.rest -= schritt; t.v *= 0.985; t.b *= 0.996;
        if (t.rest <= 0.5 || t.v < 0.25) {
          ctx.beginPath(); ctx.arc(t.x, t.y, t.b * 0.85, 0, 6.2832); ctx.fill();
          tropfen.splice(i, 1);
        }
      }
      if (aktiv || tropfen.length) requestAnimationFrame(schleife); else laeuft = false;
    }
    function starten() { if (!laeuft) { laeuft = true; requestAnimationFrame(schleife); } }

    function pos(e) {
      var r = cv.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    wand.addEventListener("pointerdown", function (e) {
      if (e.target.closest("a, button, input, .spray-leiste")) return;
      if (e.pointerType === "touch" && !wand.classList.contains("spray-an")) return;
      if (e.button && e.button !== 0) return;
      var p = pos(e);
      x = lx = p[0]; y = ly = p[1]; still = 0; aktiv = true;
      try { wand.setPointerCapture(e.pointerId); } catch (err) {}
      spruehen(x, y, farbe);
      starten();
      e.preventDefault();
    });
    wand.addEventListener("pointermove", function (e) {
      if (!aktiv) return;
      var p = pos(e);
      linie(x, y, p[0], p[1], farbe);
      x = p[0]; y = p[1];
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) {
      wand.addEventListener(ev, function () { aktiv = false; });
    });

    wand.querySelectorAll(".farbe-knopf").forEach(function (k) {
      k.addEventListener("click", function () {
        farbe = k.getAttribute("data-farbe");
        wand.querySelectorAll(".farbe-knopf").forEach(function (o) { o.setAttribute("aria-pressed", o === k ? "true" : "false"); });
      });
    });
    var putzen = wand.querySelector("[data-putzen]");
    if (putzen) putzen.addEventListener("click", function () {
      tropfen = [];
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.restore();
    });
    var modus = wand.querySelector(".spray-modus");
    if (modus) modus.addEventListener("click", function () {
      var an = wand.classList.toggle("spray-an");
      modus.setAttribute("aria-pressed", an ? "true" : "false");
      modus.textContent = an ? "Sprühen: an" : "Sprühen: aus";
    });

    // Kleine Vorführung: ein Kringel um das markierte Wort, wie mit der Dose gezogen
    var ziel = wand.querySelector("[data-kringel]");
    if (ziel && !ruhig) {
      setTimeout(function () {
        var rw = cv.getBoundingClientRect(), rz = ziel.getBoundingClientRect();
        var cx = rz.left - rw.left + rz.width / 2, cy = rz.top - rw.top + rz.height / 2;
        var ax = rz.width / 2 + 34, ay = rz.height / 2 + 18;
        var schritte = 64, i = 0, start = -2.6, px = null, py = null;
        var f = "#ffd43b";
        function zug() {
          for (var k = 0; k < 2 && i <= schritte; k++, i++) {
            var w = start + (i / schritte) * 6.2832 * 1.08;
            var nx = cx + Math.cos(w) * ax * (1 + 0.04 * Math.sin(i * 0.7));
            var ny = cy + Math.sin(w) * ay * (1 + 0.05 * Math.cos(i * 0.5)) + i * 0.25;
            if (px !== null) linie(px, py, nx, ny, f, 12);
            px = nx; py = ny;
          }
          if (i <= schritte) requestAnimationFrame(zug);
          else { tropfenStarten(px, py - 6, f); starten(); }
        }
        zug();
      }, 1300);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    statusSetzen();
    setInterval(statusSetzen, 60000);
    heuteMarkieren();
    menue();
    einblenden();
    lightbox();
    schrank();
    iban();
    spruehwand();
  });
})();

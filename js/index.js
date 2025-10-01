!(function (e) {
  function t(r) {
    if (a[r]) return a[r].exports;
    var n = (a[r] = { exports: {}, id: r, loaded: !1 });
    return e[r].call(n.exports, n, n.exports, t), (n.loaded = !0), n.exports;
  }
  var r = window.webpackJsonp;
  window.webpackJsonp = function (a, l) {
    for (var u, o, f = 0, i = []; f < a.length; f++)
      (o = a[f]), n[o] && i.push.apply(i, n[o]), (n[o] = 0);
    for (u in l) e[u] = l[u];
    for (r && r(a, l); i.length; ) i.shift().call(null, t);
  };
  var a = {},
    n = { 0: 0 };
  return (
    (t.e = function (e, r) {
      if (0 === n[e]) return r.call(null, t);
      if (void 0 !== n[e]) n[e].push(r);
      else {
        n[e] = [r];
        var a = document.getElementsByTagName("head")[0],
          l = document.createElement("script");
        (l.type = "text/javascript"),
          (l.charset = "utf-8"),
          (l.async = !0),
          (l.src = t.p + "assets/" + e + ".6ed3c15f0985dc9d172a.js"),
          a.appendChild(l);
      }
    }),
    (t.m = e),
    (t.c = a),
    (t.p = "/"),
    t(0)
  );
})([
  function (e, t, r) {
    "use strict";
    var a = r(1),
      n = a.default();
    n.SVGForeignObjectElement &&
      n.WebGL &&
      (n.WebGL.textureFloat || n.WebGL.textureHalfFloat) &&
      r.e(1, function () {
        var e = r(3);
        e.default.init();
      });
  },
  function (e, t, r) {
    "use strict";
    function a() {
      var e = { SVGForeignObjectElement: !1, WebGL: !1 };
      e.SVGForeignObjectElement = "undefined" != typeof SVGForeignObjectElement;
      for (
        var t = document.createElement("canvas"),
          r = ["webgl", "experimental-webgl"],
          a = 0;
        a < r.length;
        a++
      ) {
        var l = t.getContext(r[a]);
        if (l) {
          e.WebGL = {
            contextName: r[a],
            textureFloat: !1,
            textureHalfFloat: !1,
          };
          var u = n.default(l);
          (e.WebGL.textureFloat = !!u.textureFloat),
            (e.WebGL.textureHalfFloat = !!u.textureHalfFloat);
        }
      }
      return e;
    }
    var n = r(2);
    Object.defineProperty(t, "__esModule", { value: !0 }), (t.default = a);
  },
  function (e, t) {
    "use strict";
    var r;
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.default = function (e) {
        r = { textureFloat: !1, textureHalfFloat: !1 };
        var t = function (t) {
          var r = e.createTexture();
          e.bindTexture(e.TEXTURE_2D, r),
            e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, 1, 1, 0, e.RGBA, t, null),
            e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.LINEAR),
            e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR);
          var a = e.createFramebuffer();
          e.bindFramebuffer(e.FRAMEBUFFER, a),
            e.framebufferTexture2D(
              e.FRAMEBUFFER,
              e.COLOR_ATTACHMENT0,
              e.TEXTURE_2D,
              r,
              0
            );
          var n = e.checkFramebufferStatus(e.FRAMEBUFFER);
          return (
            e.bindFramebuffer(e.FRAMEBUFFER, null),
            e.deleteFramebuffer(a),
            e.bindTexture(e.TEXTURE_2D, null),
            e.deleteTexture(r),
            n === e.FRAMEBUFFER_COMPLETE
          );
        };
        if (
          (e.getExtension("OES_texture_float") &&
            e.getExtension("OES_texture_float_linear") &&
            t(e.FLOAT) &&
            (r.textureFloat = { type: e.FLOAT }),
          e.getExtension("OES_texture_half_float") &&
            e.getExtension("OES_texture_half_float_linear"))
        ) {
          var a = e.getExtension("OES_texture_half_float").HALF_FLOAT_OES;
          t(a) && (r.textureHalfFloat = { type: a });
        }
        return r;
      });
  },
]);

webpackJsonp(
  [1],
  [
    ,
    ,
    ,
    function (e, t, r) {
      "use strict";
      var n = r(4),
        a = r(5),
        i = r(6),
        o = r(7),
        u = r(8),
        f = r(13),
        c = r(9),
        l = r(10),
        s = r(16),
        v = function (e) {
          return n.fromByteArray(a(e));
        },
        d = function (e) {
          return new Promise(function (t, r) {
            var n = new Image();
            (n.onload = function () {
              (n.onload = null), t(n);
            }),
              (n.src = e);
          });
        },
        T = function (e) {
          var t = document.head.querySelector("style").textContent,
            r = document.getElementsByClassName(c.contentMaster)[0].innerHTML,
            n = matchMedia("(max-width: 512px)").matches,
            a =
              '\n    <svg xmlns="http://www.w3.org/2000/svg" width="' +
              m.canvas.width +
              '" height="' +
              m.canvas.height +
              '"\n      viewBox="0 0 ' +
              m.canvas.offsetWidth +
              " " +
              m.canvas.offsetHeight +
              '">\n      <rect width="101%" height="101%" fill="white" />\n      <foreignObject width="' +
              m.canvas.offsetWidth +
              '" height="' +
              m.canvas.offsetHeight +
              '">\n        <style>\n          ' +
              t +
              '\n        </style>\n        <div xmlns="http://www.w3.org/1999/xhtml" class="' +
              c.content +
              " " +
              (n ? c.isNarrow : "") +
              " " +
              (e ? c.isSelection : "") +
              '">\n          ' +
              r +
              "\n        </div>\n      </foreignObject>\n    </svg>";
          return a;
        },
        E = function () {
          var e = document.createElement("canvas");
          document.getElementsByClassName(c.panel)[0].appendChild(e);
          var t =
            e.getContext("webgl", { antialias: !1 }) ||
            e.getContext("experimental-webgl", { antialias: !1 });
          return (
            t.clearColor(1, 1, 1, 1),
            t.enable(t.DEPTH_TEST),
            t.depthFunc(t.LEQUAL),
            (t.canvas.width = t.canvas.offsetWidth * devicePixelRatio),
            (t.canvas.height = t.canvas.offsetHeight * devicePixelRatio),
            t.viewport(0, 0, t.canvas.width, t.canvas.height),
            t
          );
        },
        h = function (e) {
          var t = e.createBuffer();
          e.bindBuffer(e.ARRAY_BUFFER, t);
          var r = [-1, 1, 1, 1, -1, -1, 1, -1];
          return (
            e.bufferData(e.ARRAY_BUFFER, new Float32Array(r), e.STATIC_DRAW),
            e.bindBuffer(e.ARRAY_BUFFER, null),
            t
          );
        },
        m = E(),
        g = function (e, t) {
          var r = 1,
            n = 256,
            a = m.canvas.width,
            E = m.canvas.height,
            g = i.elementPosition(m.canvas.parentElement),
            R = {
              el: m.canvas.parentElement,
              top: g.top,
              left: g.left,
              width: m.canvas.offsetWidth,
              height: m.canvas.offsetHeight,
            },
            p = h(m),
            A = u.default(m, p, R),
            _ = o.default.createProgram(m, l, s),
            x = m.getAttribLocation(_, "aPosition"),
            U = m.getUniformLocation(_, "uHeatMapResolution"),
            b = m.getUniformLocation(_, "uTexture"),
            F = m.getUniformLocation(_, "uHeatMap"),
            P = m.getUniformLocation(_, "uAmplitude"),
            D = m.getUniformLocation(_, "uWavelength"),
            L = m.getUniformLocation(_, "uTime"),
            w = [e, t].map(function (e) {
              var t = m.createTexture();
              return (
                m.bindTexture(m.TEXTURE_2D, t),
                m.pixelStorei(m.UNPACK_FLIP_Y_WEBGL, 1),
                m.texImage2D(
                  m.TEXTURE_2D,
                  0,
                  m.RGBA,
                  m.RGBA,
                  m.UNSIGNED_BYTE,
                  e
                ),
                m.texParameteri(m.TEXTURE_2D, m.TEXTURE_MIN_FILTER, m.LINEAR),
                m.texParameteri(m.TEXTURE_2D, m.TEXTURE_MAG_FILTER, m.LINEAR),
                m.texParameteri(
                  m.TEXTURE_2D,
                  m.TEXTURE_WRAP_S,
                  m.CLAMP_TO_EDGE
                ),
                m.texParameteri(
                  m.TEXTURE_2D,
                  m.TEXTURE_WRAP_T,
                  m.CLAMP_TO_EDGE
                ),
                m.bindTexture(m.TEXTURE_2D, null),
                (e.src = ""),
                t
              );
            }),
            B = w[0],
            y = w[1],
            I = f.default(m, R, B, y),
            X = performance.now(),
            C = X,
            M = 0,
            S = 0,
            N = function () {
              var e = performance.now(),
                t = e - C;
              C = e;
              var i = A.draw(t);
              I.render(),
                m.bindFramebuffer(m.FRAMEBUFFER, null),
                m.viewport(0, 0, m.canvas.width, m.canvas.height),
                m.clear(m.COLOR_BUFFER_BIT | m.DEPTH_BUFFER_BIT),
                (S = Math.max(Math.min(1, M / 2e4), S));
              var o = r * S;
              m.useProgram(_),
                m.activeTexture(m.TEXTURE0),
                m.bindTexture(m.TEXTURE_2D, I.textureOut),
                m.activeTexture(m.TEXTURE1),
                m.bindTexture(m.TEXTURE_2D, i),
                m.uniform1i(b, 0),
                m.uniform1i(F, 1),
                m.uniform2fv(U, [512, 512]),
                m.uniform1f(P, o / (E / devicePixelRatio)),
                m.uniform1f(D, a * ((2 * Math.PI) / (n * devicePixelRatio))),
                m.uniform1f(L, Math.floor(M) / 1e4),
                m.enableVertexAttribArray(x),
                m.bindBuffer(m.ARRAY_BUFFER, p),
                m.vertexAttribPointer(x, 2, m.FLOAT, !1, 0, 0),
                m.drawArrays(m.TRIANGLE_STRIP, 0, 4);
            },
            O = function () {
              var e = i.elementPosition(m.canvas.parentElement);
              (R.top = e.top),
                (R.left = e.left),
                (R.width = m.canvas.parentElement.offsetWidth),
                (R.height = m.canvas.parentElement.offsetHeight),
                (m.canvas.width = R.width * devicePixelRatio),
                (m.canvas.height = R.height * devicePixelRatio),
                I.handleResize();
              var t = function (e) {
                return function (t) {
                  (a = m.canvas.width),
                    (E = m.canvas.height),
                    m.bindTexture(m.TEXTURE_2D, e),
                    m.pixelStorei(m.UNPACK_FLIP_Y_WEBGL, 1),
                    m.texImage2D(
                      m.TEXTURE_2D,
                      0,
                      m.RGBA,
                      m.RGBA,
                      m.UNSIGNED_BYTE,
                      t
                    ),
                    m.bindTexture(m.TEXTURE_2D, null),
                    (t.src = "");
                };
              };
              d("data:image/svg+xml;base64," + v(T(!1))).then(t(B)),
                d("data:image/svg+xml;base64," + v(T(!0))).then(t(y));
            };
          window.addEventListener("resize", O),
            document
              .getElementsByClassName(c.content)[0]
              .classList.add(c.isActive);
          var G = function (e) {
            requestAnimationFrame(G), (M = (e - X) % 1e6), N();
          };
          requestAnimationFrame(G);
        };
      Object.defineProperty(t, "__esModule", { value: !0 }),
        (t.default = {
          init: function () {
            Promise.all([
              d("data:image/svg+xml;base64," + v(T(!1))),
              d("data:image/svg+xml;base64," + v(T(!0))),
            ])
              .then(function (e) {
                e.forEach(function (e) {
                  return (e.width = m.canvas.width);
                }),
                  g(e[0], e[1]);
              })
              .catch(function (e) {
                return console.error(e);
              });
          },
        });
    },
    function (e, t) {
      "use strict";
      function r(e) {
        var t = e.length;
        if (t % 4 > 0)
          throw new Error("Invalid string. Length must be a multiple of 4");
        return "=" === e[t - 2] ? 2 : "=" === e[t - 1] ? 1 : 0;
      }
      function n(e) {
        return (3 * e.length) / 4 - r(e);
      }
      function a(e) {
        var t,
          n,
          a,
          i,
          o,
          u,
          f = e.length;
        (o = r(e)), (u = new l((3 * f) / 4 - o)), (a = o > 0 ? f - 4 : f);
        var s = 0;
        for (t = 0, n = 0; t < a; t += 4, n += 3)
          (i =
            (c[e.charCodeAt(t)] << 18) |
            (c[e.charCodeAt(t + 1)] << 12) |
            (c[e.charCodeAt(t + 2)] << 6) |
            c[e.charCodeAt(t + 3)]),
            (u[s++] = (i >> 16) & 255),
            (u[s++] = (i >> 8) & 255),
            (u[s++] = 255 & i);
        return (
          2 === o
            ? ((i = (c[e.charCodeAt(t)] << 2) | (c[e.charCodeAt(t + 1)] >> 4)),
              (u[s++] = 255 & i))
            : 1 === o &&
              ((i =
                (c[e.charCodeAt(t)] << 10) |
                (c[e.charCodeAt(t + 1)] << 4) |
                (c[e.charCodeAt(t + 2)] >> 2)),
              (u[s++] = (i >> 8) & 255),
              (u[s++] = 255 & i)),
          u
        );
      }
      function i(e) {
        return (
          f[(e >> 18) & 63] + f[(e >> 12) & 63] + f[(e >> 6) & 63] + f[63 & e]
        );
      }
      function o(e, t, r) {
        for (var n, a = [], o = t; o < r; o += 3)
          (n = (e[o] << 16) + (e[o + 1] << 8) + e[o + 2]), a.push(i(n));
        return a.join("");
      }
      function u(e) {
        for (
          var t,
            r = e.length,
            n = r % 3,
            a = "",
            i = [],
            u = 16383,
            c = 0,
            l = r - n;
          c < l;
          c += u
        )
          i.push(o(e, c, c + u > l ? l : c + u));
        return (
          1 === n
            ? ((t = e[r - 1]),
              (a += f[t >> 2]),
              (a += f[(t << 4) & 63]),
              (a += "=="))
            : 2 === n &&
              ((t = (e[r - 2] << 8) + e[r - 1]),
              (a += f[t >> 10]),
              (a += f[(t >> 4) & 63]),
              (a += f[(t << 2) & 63]),
              (a += "=")),
          i.push(a),
          i.join("")
        );
      }
      (t.byteLength = n), (t.toByteArray = a), (t.fromByteArray = u);
      for (
        var f = [],
          c = [],
          l = "undefined" != typeof Uint8Array ? Uint8Array : Array,
          s =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
          v = 0,
          d = s.length;
        v < d;
        ++v
      )
        (f[v] = s[v]), (c[s.charCodeAt(v)] = v);
      (c["-".charCodeAt(0)] = 62), (c["_".charCodeAt(0)] = 63);
    },
    function (e, t) {
      function r(e, t) {
        t = t || 1 / 0;
        for (var r, n = e.length, a = null, i = [], o = 0; o < n; o++) {
          if (((r = e.charCodeAt(o)), r > 55295 && r < 57344)) {
            if (!a) {
              if (r > 56319) {
                (t -= 3) > -1 && i.push(239, 191, 189);
                continue;
              }
              if (o + 1 === n) {
                (t -= 3) > -1 && i.push(239, 191, 189);
                continue;
              }
              a = r;
              continue;
            }
            if (r < 56320) {
              (t -= 3) > -1 && i.push(239, 191, 189), (a = r);
              continue;
            }
            (r = ((a - 55296) << 10) | (r - 56320) | 65536), (a = null);
          } else a && ((t -= 3) > -1 && i.push(239, 191, 189), (a = null));
          if (r < 128) {
            if ((t -= 1) < 0) break;
            i.push(r);
          } else if (r < 2048) {
            if ((t -= 2) < 0) break;
            i.push((r >> 6) | 192, (63 & r) | 128);
          } else if (r < 65536) {
            if ((t -= 3) < 0) break;
            i.push((r >> 12) | 224, ((r >> 6) & 63) | 128, (63 & r) | 128);
          } else {
            if (!(r < 2097152)) throw new Error("Invalid code point");
            if ((t -= 4) < 0) break;
            i.push(
              (r >> 18) | 240,
              ((r >> 12) & 63) | 128,
              ((r >> 6) & 63) | 128,
              (63 & r) | 128
            );
          }
        }
        return i;
      }
      e.exports = function (e) {
        return new Uint8Array(r(e));
      };
    },
    function (e, t) {
      "use strict";
      t.elementPosition = function (e) {
        for (
          var t = e.offsetLeft, r = e.offsetTop, n = e;
          (e = e.offsetParent);

        )
          (t += e.offsetLeft), (r += e.offsetTop), (n = e);
        return (
          n &&
            "fixed" === n.style.position &&
            ((t += document.documentElement.scrollLeft),
            (r += document.documentElement.scrollTop)),
          { left: t, top: r }
        );
      };
    },
    function (e, t) {
      "use strict";
      var r = function (e, t, r) {
          var n = e.createShader(t);
          if (
            (e.shaderSource(n, r),
            e.compileShader(n),
            !e.getShaderParameter(n, e.COMPILE_STATUS))
          ) {
            var a = e.getShaderInfoLog(n);
            throw (
              (e.deleteShader(n), "An error occured compiling shader: " + a)
            );
          }
          return n;
        },
        n = function (e, t) {
          if (("string" == typeof t && (t = document.getElementById(t)), !t))
            throw "Not a valid shader source";
          var n,
            a = t.text;
          if ("x-shader/x-fragment" === t.type) n = e.FRAGMENT_SHADER;
          else {
            if ("x-shader/x-vertex" !== t.type)
              throw "Invalid shader type: " + t.type;
            n = e.VERTEX_SHADER;
          }
          return r(e, n, a);
        },
        a = function (e, t, n) {
          "string" == typeof t && (t = r(e, e.VERTEX_SHADER, t)),
            "string" == typeof n && (n = r(e, e.FRAGMENT_SHADER, n));
          var a = e.createProgram();
          if (
            (e.attachShader(a, t),
            e.attachShader(a, n),
            e.linkProgram(a),
            !e.getProgramParameter(a, e.LINK_STATUS))
          ) {
            var i = e.getProgramInfoLog(a);
            throw (
              (e.deleteProgram(a), "Unable to initialize shader program: " + i)
            );
          }
          return a;
        };
      Object.defineProperty(t, "__esModule", { value: !0 }),
        (t.default = { createShader: r, loadShader: n, createProgram: a });
    },
    function (e, t, r) {
      "use strict";
      var n = r(2),
        a = r(7),
        i = r(9),
        o = r(10),
        u = r(11),
        f = r(12);
      Object.defineProperty(t, "__esModule", { value: !0 }),
        (t.default = function (e, t, r) {
          var c,
            l = 512,
            s = 512,
            v = r.el,
            d = new Float32Array([
              -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
              -1, -1, -1, -1, -1, -1,
            ]),
            T = n.default(e),
            E = Float32Array;
          T.textureFloat
            ? (c = T.textureFloat.type)
            : T.textureHalfFloat &&
              ((c = T.textureHalfFloat.type), (E = Uint16Array));
          for (
            var h = a.default.createProgram(e, o, u),
              m = e.getAttribLocation(h, "aPosition"),
              g = e.getUniformLocation(h, "uResolution"),
              R = e.getUniformLocation(h, "uTexture"),
              p = e.getUniformLocation(h, "uTouchPoints"),
              A = e.getUniformLocation(h, "uDeltaTime"),
              _ = a.default.createProgram(e, o, f),
              x =
                (e.getAttribLocation(_, "aPosition"),
                e.getUniformLocation(_, "uWeights")),
              U = e.getUniformLocation(_, "uTexture"),
              b = e.getUniformLocation(_, "uPixelSize"),
              F = e.getUniformLocation(_, "uDirection"),
              P = [],
              D = new E(l * s * 4),
              L = 0;
            L < l * s;
            L++
          )
            D.set([0, 0, 0, 0], 4 * L);
          for (; P.length < 2; ) {
            var w = e.createTexture();
            e.bindTexture(e.TEXTURE_2D, w),
              e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.LINEAR),
              e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR),
              e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE),
              e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE),
              e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, l, s, 0, e.RGBA, c, D);
            var B = e.createFramebuffer();
            e.bindFramebuffer(e.FRAMEBUFFER, B),
              e.framebufferTexture2D(
                e.FRAMEBUFFER,
                e.COLOR_ATTACHMENT0,
                e.TEXTURE_2D,
                w,
                0
              ),
              P.push({ texture: w, frameBuffer: B });
          }
          var y = 0,
            I = function (r) {
              var n,
                a,
                i = 0,
                o = function () {
                  (i = (y + 1) % P.length),
                    (n = P[i].frameBuffer),
                    (a = P[y].texture),
                    (y = i);
                };
              return (
                o(),
                e.bindFramebuffer(e.FRAMEBUFFER, n),
                e.viewport(0, 0, l, s),
                e.clear(e.COLOR_BUFFER_BIT | e.DEPTH_BUFFER_BIT),
                e.useProgram(h),
                e.activeTexture(e.TEXTURE0),
                e.bindTexture(e.TEXTURE_2D, a),
                e.uniform2fv(g, [l, s]),
                e.uniform1i(R, 0),
                e.uniform2fv(p, d),
                e.uniform1f(A, Math.min(r / 1e3, 4 / 60)),
                e.enableVertexAttribArray(m),
                e.bindBuffer(e.ARRAY_BUFFER, t),
                e.vertexAttribPointer(m, 2, e.FLOAT, !1, 0, 0),
                e.drawArrays(e.TRIANGLE_STRIP, 0, 4),
                o(),
                e.bindFramebuffer(e.FRAMEBUFFER, n),
                e.viewport(0, 0, l, s),
                e.clear(e.COLOR_BUFFER_BIT | e.DEPTH_BUFFER_BIT),
                e.useProgram(_),
                e.activeTexture(e.TEXTURE0),
                e.bindTexture(e.TEXTURE_2D, a),
                e.uniform1fv(
                  x,
                  [0.3225806451612904, 0.2419354838709677, 0.0967741935483871]
                ),
                e.uniform1i(U, 0),
                e.uniform2fv(b, [1 / l, 1 / s]),
                e.uniform2fv(F, [1, 0]),
                e.drawArrays(e.TRIANGLE_STRIP, 0, 4),
                o(),
                e.bindFramebuffer(e.FRAMEBUFFER, n),
                e.clear(e.COLOR_BUFFER_BIT | e.DEPTH_BUFFER_BIT),
                e.bindTexture(e.TEXTURE_2D, a),
                e.uniform2fv(F, [0, 1]),
                e.drawArrays(e.TRIANGLE_STRIP, 0, 4),
                P[i].texture
              );
            };
          if (
            (v.addEventListener("dragstart", function (e) {
              return e.preventDefault();
            }),
            "undefined" != typeof PointerEvent &&
              "undefined" == typeof TouchList)
          ) {
            document.body.classList.add(i.noTouchAction);
            var X = [],
              C = function () {
                var e = Math.min(X.length, 11),
                  t = 0;
                for (t = 0; t < e; t++) {
                  var n = X[t];
                  d.set(
                    [
                      (n.pageX - r.left) / r.width,
                      1 - (n.pageY - r.top) / r.height,
                    ],
                    2 * t
                  );
                }
                for (; t < 11; t++) d.set([-1, -1], 2 * t);
              },
              M = function (e) {
                v.setPointerCapture(e.pointerId),
                  X.push({ id: e.pointerId, pageX: e.pageX, pageY: e.pageY }),
                  C();
              },
              S = function (e) {
                for (var t = 0; t < X.length; t++)
                  if (X[t].id == e.pointerId) {
                    (X[t].pageX = e.pageX), (X[t].pageY = e.pageY), C();
                    break;
                  }
                e.isPrimary &&
                  "touch" == e.pointerType &&
                  (document.body.scrollTop += -e.movementY);
              },
              N = function (e) {
                for (var t = 0; t < X.length; t++)
                  if (X[t].id == e.pointerId) {
                    X.splice(t, 1), C();
                    break;
                  }
              };
            v.addEventListener("pointerdown", M),
              v.addEventListener("pointermove", S),
              v.addEventListener("pointerup", N),
              v.addEventListener("pointercancel", N);
          } else {
            var O = function (e) {
                var t = Math.min(10, e.length),
                  n = 0;
                for (n = 0; n < t; n++) {
                  var a = e.item(n);
                  d.set(
                    [
                      (a.pageX - r.left) / r.width,
                      1 - (a.pageY - r.top) / r.height,
                    ],
                    2 * n
                  );
                }
                for (; n < 10; n++) d.set([-1, -1], 2 * n);
              },
              G = 0,
              H = !1;
            v.addEventListener("touchstart", function (e) {
              (G = e.touches[0].clientY), (H = 0 == document.body.scrollTop);
            }),
              v.addEventListener("touchmove", function (e) {
                var t = e.touches[0].clientY - G;
                H && t > 0 && (e.preventDefault(), (H = !1));
              }),
              v.addEventListener("touchstart", function (e) {
                return O(e.touches);
              }),
              v.addEventListener("touchmove", function (e) {
                return O(e.touches);
              }),
              v.addEventListener("touchend", function (e) {
                return O(e.touches);
              }),
              v.addEventListener("touchcancel", function (e) {
                return O(e.touches);
              });
            var Y = !1;
            v.addEventListener("mousedown", function (e) {
              var t = [
                (e.pageX - r.left) / r.width,
                1 - (e.pageY - r.top) / r.height,
              ];
              Y = !0;
              for (var n = 0; n < 10; n++)
                if (
                  Math.abs(t[0] - d[2 * n]) < 0.1 &&
                  Math.abs(t[1] - d[2 * n + 1]) < 0.1
                ) {
                  Y = !1;
                  break;
                }
              Y && d.set(t, d.length - 2);
            }),
              v.addEventListener("mousemove", function (e) {
                Y &&
                  d.set(
                    [
                      (e.pageX - r.left) / r.width,
                      1 - (e.pageY - r.top) / r.height,
                    ],
                    d.length - 2
                  );
              }),
              v.addEventListener("mouseup", function (e) {
                (Y = !1), d.set([-1, -1], d.length - 2);
              });
          }
          return { draw: I };
        });
    },
    function (e, t) {
      e.exports = {
        "no-touch-action": "_6Kd9lZA",
        noTouchAction: "_6Kd9lZA",
        "content-master": "_1yrFDMT",
        contentMaster: "_1yrFDMT",
        "is-narrow": "_3n7-rwL",
        isNarrow: "_3n7-rwL",
        panel: "_5EiuNlu",
        panel: "_5EiuNlu",
        "is-active": "bhvQRPl",
        isActive: "bhvQRPl",
        content: "cINH-0S",
        content: "cINH-0S",
        "is-selection": "fNROTq-",
        isSelection: "fNROTq-",
        emoji: "_7P12PO-",
        emoji: "_7P12PO-",
      };
    },
    function (e, t) {
      e.exports =
        "attribute vec2 aPosition;varying vec2 vUv;void main(){gl_Position=vec4(aPosition,0.0,1.0);vUv=(aPosition+1.0)/2.0;}";
    },
    function (e, t) {
      e.exports =
        "precision mediump float;const float a=1.00;const float b=0.72;const float c=1.0;const float d=300.0;const float e=0.0;const float f=1.0;uniform vec2 uResolution;uniform sampler2D uTexture;uniform vec2 uTouchPoints[11];uniform float uDeltaTime;varying vec2 vUv;void main(){vec4 g=texture2D(uTexture,vUv);float h=g.r;float i=g.g;float j=0.0;float k=0.0;for(int l=0;l<11;l++){vec2 m=uTouchPoints[l]*uResolution;vec2 n=vUv*uResolution;if(m.x>0.0&&m.y>0.0){float o=length(n-m);if(o<100.0){float p=o/100.0;float q=1.0-p;float r=pow(q,20.0)*(21.0-20.0*q);k+=r;float s=-1.0*(h-f)*mix(0.0,d,r);j+=s;}}}k=clamp(k,0.0,1.0);float t=-1.0*(h-e)*c;float u=mix(a,b,k)*i*i*-1.0*sign(i);j+=u;j+=t;i+=j*uDeltaTime;h+=i*uDeltaTime;gl_FragColor=vec4(h,i,1.0,1.0);}";
    },
    function (e, t) {
      e.exports =
        "precision mediump float;uniform highp float uWeights[3];uniform sampler2D uTexture;uniform vec2 uPixelSize;uniform vec2 uDirection;varying highp vec2 vUv;void main(){vec4 a=texture2D(uTexture,vUv)*(uWeights[0]+2.0);for(int b=1;b<3;b++){a+=texture2D(uTexture,vUv+uPixelSize*float(b)*uDirection)*uWeights[b];a+=texture2D(uTexture,vUv-uPixelSize*float(b)*uDirection)*uWeights[b];}gl_FragColor=a/3.0;}";
    },
    function (e, t, r) {
      "use strict";
      var n = r(7),
        a = r(14),
        i = r(10),
        o = r(15);
      Object.defineProperty(t, "__esModule", { value: !0 }),
        (t.default = function (e, t, r, u) {
          var f = e.createTexture();
          e.bindTexture(e.TEXTURE_2D, f),
            e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR),
            e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.LINEAR),
            e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE),
            e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE),
            e.texImage2D(
              e.TEXTURE_2D,
              0,
              e.RGBA,
              e.canvas.width,
              e.canvas.height,
              0,
              e.RGBA,
              e.UNSIGNED_BYTE,
              null
            ),
            e.bindTexture(e.TEXTURE_2D, null);
          var c = e.createFramebuffer();
          e.bindFramebuffer(e.FRAMEBUFFER, c),
            e.framebufferTexture2D(
              e.FRAMEBUFFER,
              e.COLOR_ATTACHMENT0,
              e.TEXTURE_2D,
              f,
              0
            );
          var l = e.createBuffer();
          e.bindBuffer(e.ARRAY_BUFFER, l),
            e.bufferData(
              e.ARRAY_BUFFER,
              new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]),
              e.STATIC_DRAW
            );
          var s = e.createBuffer();
          e.bindBuffer(e.ARRAY_BUFFER, s),
            e.bufferData(
              e.ARRAY_BUFFER,
              new Float32Array([0, 1, 2, 3]),
              e.STATIC_DRAW
            );
          var v = n.default.createProgram(e, a, o),
            d = e.getAttribLocation(v, "aIndex"),
            T = e.getUniformLocation(v, "uCoords"),
            E = e.getUniformLocation(v, "uTexture"),
            h = n.default.createProgram(e, i, o),
            m = e.getAttribLocation(h, "aPosition"),
            g = e.getUniformLocation(h, "uTexture"),
            R = [],
            p = function (e) {
              var t = document.getSelection();
              if (t.rangeCount > 0) {
                var r = t.getRangeAt(0),
                  n = r.getClientRects();
                R = [];
                for (var a = 0; a < n.length; a++)
                  R.push({
                    top: n[a].top + document.body.scrollTop,
                    left: n[a].left + document.body.scrollLeft,
                    width: n[a].width,
                    height: n[a].height,
                  });
              }
            };
          document.addEventListener("selectionchange", p),
            window.addEventListener("resize", p);
          var A = function () {
              e.bindFramebuffer(e.FRAMEBUFFER, c),
                e.viewport(0, 0, e.canvas.width, e.canvas.height),
                e.clear(e.COLOR_BUFFER_BIT | e.DEPTH_BUFFER_BIT),
                e.useProgram(h),
                e.enableVertexAttribArray(m),
                e.bindBuffer(e.ARRAY_BUFFER, l),
                e.vertexAttribPointer(m, 2, e.FLOAT, !1, 0, 0),
                e.activeTexture(e.TEXTURE0),
                e.bindTexture(e.TEXTURE_2D, r),
                e.uniform1i(g, 0),
                e.drawArrays(e.TRIANGLE_STRIP, 0, 4),
                e.useProgram(v),
                e.enableVertexAttribArray(d),
                e.bindBuffer(e.ARRAY_BUFFER, s),
                e.vertexAttribPointer(d, 1, e.FLOAT, !1, 0, 0),
                e.activeTexture(e.TEXTURE0),
                e.bindTexture(e.TEXTURE_2D, u),
                e.uniform1i(E, 0);
              for (var n = 0; n < R.length; n++) {
                var a = R[n],
                  i = [
                    -1 + (2 * (a.left - t.left)) / t.width,
                    1 + (-2 * (a.top - t.top)) / t.height,
                    -1 + (2 * (a.left + a.width - t.left)) / t.width,
                    1 + (-2 * (a.top + a.height - t.top)) / t.height,
                  ];
                e.uniform4fv(T, i), e.drawArrays(e.TRIANGLE_STRIP, 0, 4);
              }
            },
            _ = function () {
              e.bindTexture(e.TEXTURE_2D, f),
                e.texImage2D(
                  e.TEXTURE_2D,
                  0,
                  e.RGBA,
                  e.canvas.width,
                  e.canvas.height,
                  0,
                  e.RGBA,
                  e.UNSIGNED_BYTE,
                  null
                ),
                e.bindTexture(e.TEXTURE_2D, null);
            };
          return { handleResize: _, render: A, textureOut: f };
        });
    },
    function (e, t) {
      e.exports =
        "attribute float aIndex;uniform vec4 uCoords;varying vec2 vUv;void main(){vec2 a;if(aIndex<0.5){a=uCoords.rg;}else if(aIndex<1.5){a=uCoords.bg;}else if(aIndex<2.5){a=uCoords.ra;}else if(aIndex<3.5){a=uCoords.ba;}gl_Position=vec4(a,0.0,1.0);vUv=vec2(0.5)+a*0.5;}";
    },
    function (e, t) {
      e.exports =
        "uniform highp sampler2D uTexture;varying highp vec2 vUv;void main(){gl_FragColor=texture2D(uTexture,vUv);}";
    },
    function (e, t) {
      e.exports =
        "precision mediump float;uniform vec2 uHeatMapResolution;uniform highp sampler2D uTexture;uniform sampler2D uHeatMap;uniform float uAmplitude;uniform float uWavelength;uniform float uTime;varying highp vec2 vUv;void main(){vec2 a=vec2(0.0,sin(uWavelength*(vUv.x-uTime))*uAmplitude);vec2 b=1.0/uHeatMapResolution;float c=texture2D(uHeatMap,vec2(vUv.x,vUv.y-b.y*.5)).r;float d=texture2D(uHeatMap,vec2(vUv.x,vUv.y+b.y*.5)).r;float e=texture2D(uHeatMap,vec2(vUv.x-b.x*0.5,vUv.y)).r;float f=texture2D(uHeatMap,vec2(vUv.x+b.x*0.5,vUv.y)).r;vec2 g=vec2(f-e,d-c)/.5;vec2 h=vUv+g*g*sign(g)*4.0;float i=texture2D(uHeatMap,vUv).r;vec4 j=texture2D(uTexture,h+a+vec2(i*b.x*0.0,0.0));vec4 k=texture2D(uTexture,h+a+vec2(i*b.x*2.0,0.0));vec4 l=texture2D(uTexture,h+a+vec2(i*b.x*4.0,0.0));gl_FragColor=vec4(j.r,k.b,l.g,1.0);}";
    },
  ]
);

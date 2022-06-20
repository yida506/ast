function o(e) {
  for (var a = 4; void 0 !== a;) switch (a) {
    case 5:
      var u = S.charCodeAt(R);
      var p = u ^ E;
      E = u;
      x += String.fromCharCode(p);
      R++;
      a = 208;
      break;

    case 6:
      var l = e[d];

      if (l) {
        return;
      } else {
        var b = "tegrat";
        var o = b.split("").reverse().join("");
        var t = e[o];
        var i = !t;

        if (i) {
          var S = "C1R{sx\f";
          var x = "";
          var E = 0;
          var R = 0;
          a = 208;
        } else {
          a = 7;
        }
      }

      break;

    case 128:
      a = void 0;
      break;

    case 7:
      var f = t;
      var g = "t";
      g += "agNa";
      g += "me";
      var w = g;
      var C = "\x80";
      var m = "";
      var j = 0;
      a = 192;
      break;

    case 13:
      var N = h;

      if (N) {
        k(f);
        a = 128;
      } else {
        f = f[D];
        a = 80;
      }

    case 144:
      if (d) {
        d += "evented";
      }

      a = 6;
      break;

    case 192:
      if (j < C.length) {
        var A = C.charCodeAt(j) - 63;
        m += String.fromCharCode(A);
        j++;
        a = 192;
      } else {
        var y = m;
        var O = "AERA";
        var M = O.split("").reverse().join("");
        var _ = M;
        var T = "par";
        T += "entNo";
        T += "de";
        var D = T;
        a = 80;
      }

      break;

    case 208:
      if (R < S.length) {
        if (!R) {
          E = 48;
        }

        a = 5;
      } else {
        t = e[x];
        a = 7;
      }

    case 80:
      var I = !f;

      if (I) {
        a = 128;
      } else {
        var n = f[w];
        var h = n === y;
        var v = !h;

        if (v) {
          h = n === _;
        }

        a = 13;
      }

      break;

    case 4:
      var d = "d";
      d += "efaul";

      if (d) {
        d += "tPr";
      }

      a = 144;
      break;
  }
}
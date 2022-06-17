function o(e) {
    for (var a = 4; void 0 !== a;) {
      var r = 15 & a;
      var s = a >> 4;
      var c = 15 & s;

      switch (r) {
        case 0:
          switch (c) {
            case 0:
              R++;
              a = 208;
              break;

            case 1:
              t = e[x];
              a = 7;
              break;

            case 2:
              f = f[D];
              a = 80;
              break;

            case 3:
              d += "tPr";
              a = 144;
              break;

            case 4:
              if (R) {
                a = 5;
              } else {
                a = 96;
              }

              break;

            case 5:
              a = 12;
              break;

            case 6:
              E = 48;
              a = 5;
              break;

            case 7:
              a = 128;
              break;

            case 8:
              a = void 0;
              break;

            case 9:
              if (d) {
                a = 1;
              } else {
                a = 6;
              }

              break;

            case 10:
              h = n === _;
              a = 13;
              break;

            case 11:
              j++;
              a = 192;
              break;

            case 12:
              if (j < C.length) {
                a = 9;
              } else {
                a = 11;
              }

              break;

            case 13:
              if (R < S.length) {
                a = 64;
              } else {
                a = 16;
              }

          }

          break;

        case 1:
          switch (c) {
            case 0:
              d += "evented";
              a = 6;
              break;

            case 1:
              k(f);
              a = 128;
          }

          break;

        case 2:
          var b = "tegrat";
          var o = b.split("").reverse().join("");
          var t = e[o];
          var i = !t;

          if (i) {
            a = 10;
          } else {
            a = 7;
          }

          break;

        case 3:
          var n = f[w];
          var h = n === y;
          var v = !h;

          if (v) {
            a = 160;
          } else {
            a = 13;
          }

          break;

        case 4:
          var d = "d";
          d += "efaul";

          if (d) {
            a = 48;
          } else {
            a = 144;
          }

          break;

        case 5:
          var u = S.charCodeAt(R);
          var p = u ^ E;
          E = u;
          x += String.fromCharCode(p);
          a = 0;
          break;

        case 6:
          var l = e[d];

          if (l) {
            a = 8;
          } else {
            a = 2;
          }

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

        case 8:
          return;

        case 9:
          var A = C.charCodeAt(j) - 63;
          m += String.fromCharCode(A);
          a = 176;
          break;

        case 10:
          var S = "C1R{sx\f";
          var x = "";
          var E = 0;
          var R = 0;
          a = 208;
          break;

        case 11:
          var y = m;
          var O = "AERA";
          var M = O.split("").reverse().join("");
          var _ = M;
          var T = "par";
          T += "entNo";
          T += "de";
          var D = T;
          a = 80;
          break;

        case 12:
          var I = !f;

          if (I) {
            a = 112;
          } else {
            a = 3;
          }

          break;

        case 13:
          var N = h;

          if (N) {
            a = 17;
          } else {
            a = 32;
          }

      }
    }
  }
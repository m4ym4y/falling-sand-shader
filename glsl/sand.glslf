precision highp float;
uniform sampler2D state;
uniform highp float seed;

// uniform vec2 scale;
#define scale 1024.0

// 246,215,176
#define sand vec4(0.9647058823529412, 0.8431372549019608, 0.6901960784313725, 1.0)

// 127,127,127
#define wall vec4(0.4980392156862745, 0.4980392156862745, 0.4980392156862745, 1.0)

// 0,0,0
#define empty vec4(0.0, 0.0, 0.0, 1.0)

// 255, 0, 0
#define fire vec4(1.0, 0.0, 0.0, 1.0)
#define fire_burnout_1 vec4(0.8, 0.2, 0.2, 1.0)
#define fire_burnout_2 vec4(0.6, 0.2, 0.2, 1.0)

// 129, 133, 137
#define metal vec4(0.5058823529411764, 0.5215686274509804, 0.5372549019607843, 1.0)
#define metal_sparking vec4(1.0, 0.7647058823529411, 0.0, 1.0)
#define metal_sparked vec4(1.0, 0.9372549019607843, 0.0, 1.0)

// 255, 230, 0
#define lightning vec4(1.0, 0.9019607843137255, 0.0, 1.0)

// 11, 78, 55
#define cloner vec4(0.43529411764705883, 0.3058823529411765, 0.21568627450980393, 1.0)
#define cloner_sand vec4(0.43529411764705883, 0.3058823529411765, 0.2196078431372549, 1.0)
#define cloner_fire vec4(0.43529411764705883, 0.3058823529411765, 0.2235294117647059, 1.0)

#define eq(a, b) (length(a - b) < 0.001)
#define neq(a, b) (length(a - b) >= 0.001)
#define adjacent(material) \
  (eq(dc, material) || \
  eq(dr, material) || \
  eq(dl, material) || \
  eq(uc, material) || \
  eq(ul, material) || \
  eq(ur, material) || \
  eq(uc, material))

vec4 get(int x, int y) {
  return vec4(texture2D(state, (gl_FragCoord.xy + vec2(x, y)) / scale));
}

float rand() {
  return fract(sin(dot(vec2(gl_FragCoord.xy) * seed, vec2(12.9898, 78.233))) * 43758.5453);
}

// is a material solid?
bool solid(vec4 material) {
  return eq(material, sand) ||
    eq(material, wall) ||
    eq(material, cloner) ||
    eq(material, cloner_fire) ||
    eq(material, cloner_sand) ||
    eq(material, metal) ||
    eq(material, metal_sparking) ||
    eq(material, metal_sparked);
}

bool unreactive(vec4 material) {
  return eq(material, wall) ||
    eq(material, cloner_fire) ||
    eq(material, cloner_sand);
}

void main() {
  vec4 current = vec4(get(0, 0));

  // minimize work for unreactive elements
  if (unreactive(current)) {
    gl_FragColor = current;
    return;
  }

  // down left, up left, center left, etc.
  vec4 ur = vec4(get(1, 1));
  vec4 uc = vec4(get(0, 1));
  vec4 ul = vec4(get(-1, 1));
  vec4 cl = vec4(get(-1, 0));
  vec4 cr = vec4(get(1, 0));
  vec4 dl = vec4(get(-1, -1));
  vec4 dc = vec4(get(0, -1));
  vec4 dr = vec4(get(1, -1));

  if (eq(current, cloner)) {
    // cloner exposed to fire becomes fire cloner
    if (adjacent(cloner_fire) || adjacent(fire)) {
      gl_FragColor = cloner_fire;
    }

    // cloner exposed to sand becomes sand cloner
    else if (adjacent(cloner_sand) || adjacent(sand)) {
      gl_FragColor = cloner_sand;
    }

    // stay as cloner otherwise
    else {
      gl_FragColor = cloner;
    }
  }

  else if (eq(current, sand)) {
    // sand exposed to fire + random catch chance = fire
    if ((adjacent(fire) || adjacent(metal_sparking)) && rand() > 0.7) {
      gl_FragColor = fire;
    }

    else if (
      // sand lands on something = cell stays as sand
      solid(dc) &&
      // sand is not on a corner; sand on corner will fall
      (
        neq(uc, empty) ||
        neq(dc, sand) ||
        (
          (neq(cl, empty) || neq(ul, empty) || neq(dl, empty)) &&
          (neq(cr, empty) || neq(ur, empty) || neq(dr, empty))
        )
      )
    ) {
      gl_FragColor = sand;
    }

    // if there is no solid ground OR this cell is the corner of a pile,
    // the sand will fall. this cell becomes empty.
    else {
      gl_FragColor = empty;
    }
  }

  // each stage of fire will 90% stay the same, or progress to the next stage of burning
  else if (eq(current, fire)) {
    if (rand() > 0.9) {
      gl_FragColor = fire_burnout_1;
    } else {
      gl_FragColor = fire;
    }
  }

  else if (eq(current, fire_burnout_1)) {
    if (rand() > 0.9) {
      gl_FragColor = fire_burnout_2;
    } else {
      gl_FragColor = fire_burnout_1;
    }
  }

  else if (eq(current, fire_burnout_2)) {
    if (rand() > 0.9) {
      gl_FragColor = empty;
    } else {
      gl_FragColor = fire_burnout_2;
    }
  }

  else if (eq(current, metal)) {
    if (adjacent(lightning) || adjacent(metal_sparking)) {
      gl_FragColor = metal_sparking;
    } else {
      gl_FragColor = metal;
    }
  }

  else if (eq(current, metal_sparking)) {
    gl_FragColor = metal_sparked;
  }

  else if (eq(current, metal_sparked)) {
    if (rand() > 0.95) {
      gl_FragColor = metal;
    } else {
      gl_FragColor = metal_sparked;
    }
  }

  else if (eq(current, empty)) {
    if (
      // is sand falling into this cell vertically
      eq(uc, sand) ||
      // is sand falling into this cell from adjacent corner of pile
      (
        eq(uc, empty) &&
        eq(dc, empty) &&
        (
          (
            eq(cr, sand) &&
            eq(ur, empty) &&
            eq(dr, sand)
          ) ||
          (
            eq(cl, sand) &&
            eq(ul, empty) &&
            eq(dl, sand)
          )
        )
      )
    ) {
      gl_FragColor = sand;
    }

    // cell under a sand cloner will become sand
    else if (eq(current, empty) && eq(uc, cloner_sand)) {
      if (rand() > 0.95) {
        gl_FragColor = sand;
      } else {
        gl_FragColor = empty;
      }
    }

    // cell over a fire cloner will become fire
    else if (eq(current, empty) && eq(dc, cloner_fire)) {
      if (rand() > 0.5) {
        gl_FragColor = fire;
      } else {
        gl_FragColor = empty;
      }
    }

    // cell over a fire that is burning out will become fire, causing rising flame effect
    else if (eq(current, empty) && eq(dc, fire_burnout_1)) {
      if (rand() > 0.2) {
        gl_FragColor = fire_burnout_1;
      } else {
        gl_FragColor = fire_burnout_2;
      }
    }

    // empty cells with no other rules are empty
    else {
      gl_FragColor = empty;
    }
  }

  // uncategorized materials are erased
  else {
    gl_FragColor = empty;
  }
}

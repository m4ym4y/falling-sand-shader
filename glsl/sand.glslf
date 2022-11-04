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

// 11, 78, 55
#define cloner vec4(0.43529411764705883, 0.3058823529411765, 0.21568627450980393, 1.0)
#define cloner_sand vec4(0.43529411764705883, 0.3058823529411765, 0.2196078431372549, 1.0)
#define cloner_fire vec4(0.43529411764705883, 0.3058823529411765, 0.2235294117647059, 1.0)

#define adjacent(material) \
  dc == material || \
  dr == material || \
  dl == material || \
  uc == material || \
  ul == material || \
  ur == material || \
  uc == material

vec4 get(int x, int y) {
  return vec4(texture2D(state, (gl_FragCoord.xy + vec2(x, y)) / scale));
}

float rand() {
  return fract(sin(dot(gl_FragCoord * seed, vec2(12.9898, 78.233))) * 43758.5453);
}

// is a material solid?
bool solid(vec4 material) {
  return material == sand ||
    material == wall ||
    material == cloner ||
    material == cloner_fire ||
    material == cloner_sand;
}

bool unreactive(vec4 material) {
  return material == wall ||
    material == cloner_fire ||
    material == cloner_sand;
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

  if (current == cloner) {
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

  else if (current == sand) {
    // sand exposed to fire + random catch chance = fire
    if (adjacent(fire) && rand() > 0.7) {
      gl_FragColor = fire;
    }

    else if (
      // sand lands on something = cell stays as sand
      solid(dc) &&
      // sand is not on a corner; sand on corner will fall
      (
        uc != empty ||
        dc != sand ||
        (
          (cl != empty || ul != empty || dl != empty) &&
          (cr != empty || ur != empty || dr != empty)
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
  else if (current == fire) {
    if (rand() > 0.9) {
      gl_FragColor = fire_burnout_1;
    } else {
      gl_FragColor = fire;
    }
  }

  else if (current == fire_burnout_1) {
    if (rand() > 0.9) {
      gl_FragColor = fire_burnout_2;
    } else {
      gl_FragColor = fire_burnout_1;
    }
  }

  else if (current == fire_burnout_2) {
    if (rand() > 0.9) {
      gl_FragColor = empty;
    } else {
      gl_FragColor = fire_burnout_2;
    }
  }

  else if (current == empty) {
    if (
      // is sand falling into this cell vertically
      uc == sand ||
      // is sand falling into this cell from adjacent corner of pile
      (
        uc == empty &&
        dc == empty &&
        (
          (
            cr == sand &&
            ur == empty &&
            dr == sand
          ) ||
          (
            cl == sand &&
            ul == empty &&
            dl == sand
          )
        )
      )
    ) {
      gl_FragColor = sand;
    }

    // cell under a sand cloner will become sand
    else if (current == empty && uc == cloner_sand) {
      if (rand(vec2(gl_FragCoord) * (seed + 2.0)) > 0.95) {
        gl_FragColor = sand;
      } else {
        gl_FragColor = empty;
      }
    }

    // cell over a fire cloner will become fire
    else if (current == empty && dc == cloner_fire) {
      if (rand(vec2(gl_FragCoord) * (seed + 2.0)) > 0.5) {
        gl_FragColor = fire;
      } else {
        gl_FragColor = empty;
      }
    }

    // cell over a fire that is burning out will become fire, causing rising flame effect
    else if (current == empty && dc == fire_burnout_1) {
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

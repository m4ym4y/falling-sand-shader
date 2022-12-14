precision highp float;
uniform sampler2D state;
uniform highp float seed;

// uniform vec2 scale;
#define scale 1024.0

// 246,215,176
#define dust vec4(0.9647058823529412, 0.8431372549019608, 0.6901960784313725, 1.0)

// 127,127,127
#define wall vec4(0.4980392156862745, 0.4980392156862745, 0.4980392156862745, 1.0)

// 0,0,0
#define empty vec4(0.0, 0.0, 0.0, 1.0)

// 255, 0, 0
#define fire vec4(1.0, 0.0, 0.0, 1.0)
#define fire_burnout_1 vec4(1.0, 0.6470588235294118, 0.0, 1.0)
#define fire_burnout_2 vec4(0.6, 0.2, 0.2, 1.0)

// 129, 133, 137
#define metal vec4(0.5058823529411764, 0.5215686274509804, 0.5372549019607843, 1.0)
#define metal_sparking vec4(1.0, 0.7647058823529411, 0.0, 1.0)
#define metal_sparked vec4(1.0, 0.9372549019607843, 0.0, 1.0)

// 255, 230, 0
#define lightning vec4(1.0, 0.9019607843137255, 0.0, 1.0)

// 102, 153, 255
#define water vec4(0.4, 0.6, 1.0, 1.0)

// 11, 78, 55
#define cloner vec4(0.43529411764705883, 0.3058823529411765, 0.21568627450980393, 1.0)
#define cloner_dust vec4(0.43529411764705883, 0.3058823529411765, 0.2196078431372549, 1.0)
#define cloner_fire vec4(0.43529411764705883, 0.3058823529411765, 0.2235294117647059, 1.0)
#define cloner_water vec4(0.43529411764705883, 0.3058823529411765, 0.22745098039215686, 1.0)

// 191, 170, 177
#define quartz vec4(0.7490196078431373, 0.6705882352941176, 0.6941176470588235, 1.0)
#define quartz_charging vec4(1.0, 0.6627450980392157, 0.6901960784313725, 1.0)
#define quartz_charged vec4(1.0, 0.8, 0.8705882352941177, 1.0)
#define quartz_sparking vec4(1.0, 0.0, 1.0, 1.0)
#define quartz_sparked vec4(0.8, 0.0, 0.8, 1.0)

// 4, 93, 93
#define sink vec4(0.01568627450980392, 0.36470588235294116, 0.36470588235294116, 1.0)

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
  return eq(material, dust) ||
    eq(material, wall) ||
    eq(material, cloner) ||
    eq(material, cloner_fire) ||
    eq(material, cloner_dust) ||
    eq(material, cloner_water) ||
    eq(material, metal) ||
    eq(material, metal_sparking) ||
    eq(material, metal_sparked) ||
    eq(material, quartz) ||
    eq(material, quartz_sparking) ||
    eq(material, quartz_charged) ||
    eq(material, water);
}

bool unreactive(vec4 material) {
  return eq(material, wall) ||
    eq(material, cloner_fire) ||
    eq(material, cloner_water) ||
    eq(material, cloner_dust) ||
    eq(material, sink);
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

  // there are the most empty cells, so do this one first
  if (eq(current, empty)) {
    if (
      // is dust falling into this cell vertically
      eq(uc, dust) ||
      // is dust falling into this cell from adjacent corner of pile
      (
        eq(uc, empty) &&
        eq(dc, empty) &&
        (
          (
            eq(cr, dust) &&
            eq(ur, empty) &&
            eq(dr, dust)
          ) ||
          (
            eq(cl, dust) &&
            eq(ul, empty) &&
            eq(dl, dust)
          )
        )
      )
    ) {
      gl_FragColor = dust;
    }

    else if (
      eq(uc, water) ||
      (eq(cl, water) && neq(dl, empty) && eq(ul, empty)) ||
      (eq(cr, water) && neq(dr, empty) && eq(ur, empty)) ||
      (
        (
          eq(cr, water) &&
          eq(ur, empty) &&
          eq(dr, water)
        ) ||
        (
          eq(cl, water) &&
          eq(ul, empty) &&
          eq(dl, water)
        )
      )
    ) {
      gl_FragColor = water;
    }

    // cell under a dust cloner will become dust
    else if (eq(current, empty) && eq(uc, cloner_dust)) {
      if (rand() > 0.95) {
        gl_FragColor = dust;
      } else {
        gl_FragColor = empty;
      }
    }

    // cell under a water cloner will become water
    else if (eq(current, empty) && eq(uc, cloner_water)) {
      if (rand() > 0.95) {
        gl_FragColor = water;
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

  else if (eq(current, cloner)) {
    // cloner exposed to fire becomes fire cloner
    if (adjacent(cloner_fire) || adjacent(fire)) {
      gl_FragColor = cloner_fire;
    }

    // cloner exposed to dust becomes dust cloner
    else if (adjacent(cloner_dust) || adjacent(dust)) {
      gl_FragColor = cloner_dust;
    }
    //
    // cloner exposed to water becomes water cloner
    else if (adjacent(cloner_water) || adjacent(water)) {
      gl_FragColor = cloner_water;
    }

    // stay as cloner otherwise
    else {
      gl_FragColor = cloner;
    }
  }

  else if (eq(current, dust)) {
    // dust exposed to fire + random catch chance = fire
    if ((adjacent(fire) || adjacent(metal_sparking)) && rand() > 0.7) {
      gl_FragColor = fire;
    }

    else if (
      // dust lands on something = cell stays as dust
      solid(dc) &&
      // dust is not on a corner; dust on corner will fall
      (
        neq(uc, empty) ||
        neq(dc, dust) ||
        (
          (neq(cl, empty) || neq(ul, empty) || neq(dl, empty)) &&
          (neq(cr, empty) || neq(ur, empty) || neq(dr, empty))
        )
      )
    ) {
      gl_FragColor = dust;
    }

    // if there is no solid ground OR this cell is the corner of a pile,
    // the dust will fall. this cell becomes empty.
    else {
      gl_FragColor = empty;
    }
  }

  else if (eq(current, water)) {
    if (
      solid(dc) &&
      (
        (neq(cr, empty) && neq(cl, empty)) ||
        (eq(cr, empty) && eq(get(2, 0), water) && neq(cl, water)) ||
        (eq(cl, empty) && eq(get(-2, 0), water) && neq(cr, water)) ||
        neq(uc, empty)
      ) &&
      (
        (neq(cl, empty) || neq(ul, empty) || neq(dl, empty)) &&
        (neq(cr, empty) || neq(ur, empty) || neq(dr, empty))
      )
    ) {
      gl_FragColor = water;
    } else {
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
    if (adjacent(lightning) || adjacent(metal_sparking) || adjacent(quartz_sparking)) {
      gl_FragColor = metal_sparking;
    } else {
      gl_FragColor = metal;
    }
  }

  else if (eq(current, metal_sparking)) {
    gl_FragColor = metal_sparked;
  }

  else if (eq(current, metal_sparked)) {
    if (rand() > 0.99) {
      gl_FragColor = metal;
    } else {
      gl_FragColor = metal_sparked;
    }
  }

  else if (eq(current, quartz)) {
    // do we need to check both?
    if (adjacent(lightning) || adjacent(metal_sparking) || adjacent(quartz_charging)) {
      gl_FragColor = quartz_charging;
    } else {
      gl_FragColor = quartz;
    }
  }
  
  else if (eq(current, quartz_charging)) {
    if (adjacent(quartz_sparking)) {
      gl_FragColor = quartz_sparking;
    } else if (rand() > 0.99) {
      gl_FragColor = quartz_charged;
    } else {
      gl_FragColor = quartz_charging;
    }
  }

  else if (eq(current, quartz_charged)) {
    if (adjacent(lightning) || adjacent(metal_sparking) || adjacent(quartz_sparking)) {
      gl_FragColor = quartz_sparking;
    } else {
      gl_FragColor = quartz_charged;
    }
  }

  else if (eq(current, quartz_sparking)) {
    gl_FragColor = quartz_sparked;
  }

  else if (eq(current, quartz_sparked)) {
    if (rand() > 0.99) {
      gl_FragColor = quartz;
    } else {
      gl_FragColor = quartz_sparked;
    }
  }

  // uncategorized materials are erased
  else {
    gl_FragColor = empty;
  }
}

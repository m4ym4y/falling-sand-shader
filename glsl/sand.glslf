precision highp float;
uniform sampler2D state;
// uniform vec2 scale;
uniform highp float seed;
#define scale vec2(1024.0, 1024.0)

// 246,215,176
#define sand vec4(0.9647058823529412, 0.8431372549019608, 0.6901960784313725, 1.0)
// 127,127,127
#define wall vec4(0.4980392156862745, 0.4980392156862745, 0.4980392156862745, 1.0)
// 0,0,0
#define empty vec4(0.0, 0.0, 0.0, 1.0)

// 255, 0, 0
#define fire vec4(1.0, 0.0, 0.0, 1.0)
// 204, 0, 0
#define fire_burnout_1 vec4(0.8, 0.2, 0.2, 1.0)
// 153, 0, 0
#define fire_burnout_2 vec4(0.6, 0.2, 0.2, 1.0)

// 11, 78, 55
#define cloner vec4(0.43529411764705883, 0.3058823529411765, 0.21568627450980393, 1.0)
#define cloner_sand vec4(0.43529411764705883, 0.3058823529411765, 0.2196078431372549, 1.0)
#define cloner_fire vec4(0.43529411764705883, 0.3058823529411765, 0.2235294117647059, 1.0)

vec4 get(int x, int y) {
  return vec4(texture2D(state, (gl_FragCoord.xy + vec2(x, y)) / scale));
}

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 current = vec4(get(0, 0));

  // down left, up left, center left, etc.
  vec4 ur = vec4(get(1, 1));
  vec4 uc = vec4(get(0, 1));
  vec4 ul = vec4(get(-1, 1));
  vec4 cl = vec4(get(-1, 0));
  vec4 cr = vec4(get(1, 0));
  vec4 dl = vec4(get(-1, -1));
  vec4 dc = vec4(get(0, -1));
  vec4 dr = vec4(get(1, -1));

  bool iswall = current == wall;
  bool sandontop = uc == sand;
  bool onbottom = dc == sand || dc == wall || dc == cloner || dc == cloner_fire || dc == cloner_sand;
  bool issand = current == sand;
  bool iscloner = current == cloner;

  bool isfireadjacent =
    dc == fire ||
    dr == fire ||
    dl == fire ||
    uc == fire ||
    ul == fire ||
    ur == fire ||
    uc == fire;

  if (iswall || current == cloner_fire || current == cloner_sand) {
    gl_FragColor = current;
  } else if (iscloner) {
    if (
      (uc == cloner_fire || dc == cloner_fire || cl == cloner_fire || cr == cloner_fire) ||
      (uc == fire || dc == fire || cl == fire || cr == fire)
    ) {
      gl_FragColor = cloner_fire;
    } else if (
      (uc == cloner_sand || dc == cloner_sand || cl == cloner_sand || cr == cloner_sand) ||
      (uc == sand || dc == sand || cl == sand || cr == sand)
    ) {
      gl_FragColor = cloner_sand;
    } else {
      gl_FragColor = cloner;
    }
  } else {
    if (issand) {
      // particle exposed to fire = fire
      if (isfireadjacent && rand(vec2(gl_FragCoord) * seed) > 0.7) {
        gl_FragColor = fire;
      // particle lands on something = filled
      // particle is not on a corner
      } else if (
        onbottom &&
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
      // particle is falling out of this cell, nothing falling in = empty
      } else {
        gl_FragColor = empty;
      }
    }
    
    // particle is falling into this cell = filled
    else if (sandontop) {
      gl_FragColor = sand;
    }

    else if (current == fire) {
      if (rand(vec2(gl_FragCoord) * (seed + 1.0)) > 0.9) {
        gl_FragColor = fire_burnout_1;
      } else {
        gl_FragColor = fire;
      }
    } else if (current == fire_burnout_1) {
      if (rand(vec2(gl_FragCoord) * (seed + 1.0)) > 0.9) {
        gl_FragColor = fire_burnout_2;
      } else {
        gl_FragColor = fire_burnout_1;
      }
    } else if (current == fire_burnout_2) {
      if (rand(vec2(gl_FragCoord) * (seed + 2.0)) > 0.9) {
        gl_FragColor = empty;
      } else {
        gl_FragColor = fire_burnout_2;
      }
    }

    else if (current == empty) {
      if (
        uc == empty &&
        dc == empty &&
        ((
          cr == sand &&
          ur == empty &&
          dr == sand
        ) ||
        (
          cl == sand &&
          ul == empty &&
          dl == sand
        ))
      ) {
        gl_FragColor = sand;
      }
      else if (current == empty && uc == cloner_sand) {
        if (rand(vec2(gl_FragCoord) * (seed + 2.0)) > 0.95) {
          gl_FragColor = sand;
        } else {
          gl_FragColor = empty;
        }
      }
      else if (current == empty && dc == cloner_fire) {
        if (rand(vec2(gl_FragCoord) * (seed + 2.0)) > 0.5) {
          gl_FragColor = fire;
        } else {
          gl_FragColor = empty;
        }
      }
      else if (current == empty && dc == fire_burnout_1) {
        if (rand(vec2(gl_FragCoord) * (seed + 2.0)) > 0.2) {
          gl_FragColor = fire_burnout_1;
        } else {
          gl_FragColor = fire_burnout_2;
        }
      }
      else {
        gl_FragColor = empty;
      }
    }

    // not filled, nothing on bottom
    else {
      gl_FragColor = empty;
    }
  }
}

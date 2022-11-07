# sand game shader

![screenshot](./screenshot.png)

[**Try it out**](https://m4ym4y.github.io/falling-sand-shader/)

fragment shader that implements falling particles similar to ['falling sand
game'](https://boredhumans.com/falling_sand.php), but using the GPU to achieve
better performance with more particles.

a lot of the code's structure comes from [this blog post](https://nullprogram.com/blog/2014/06/10),
which describes how to set up a simulation using webgl fragment shaders.

## Elements

### Dust

Dust will fall, form piles, and is highly flammable.

### Wall

Walls will stay in place solidly, and never react to other elements. They can
be destroyed by erasing or drawing over them.

### Fire

Fire will spread between adjacent dust particles, destroying them in the process.

### Cloner

Cloners are static like walls, but in contact with another element will turn
into a cloner that endlessly produces particles of that element type. (This is
only implemented for dust and fire right now)

### Metal

Metal is static like walls, but can conduct electricity (lightning). Electricity travels
through metal very quickly, and if metal that is electrified comes into contact with dust,
it will spark into a fire.

### Lightning

Lightning fades instantly (in the current version), but if it is placed directly touching metal
it will electrify the metal and cause electricity to conduct through it.

### Quartz

**Experimental**

When it comes into contact with electrified metal or lightning, quartz will
become charged. If charged quartz comes into contact with lightning or
electrified metal, it will release a shockwave that will cause metal to become
electrified.

### Water

**Experimental**

Water falls like sand, but tries to spread out and fill its container unlike
dust. However, the current version of doesn't really obey any laws of physics.

### Sink

Sink is a solid element like a wall, but any particle that lands on it is destroyed.

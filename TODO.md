
=== Backlog

- Test when update() is called and how to get which fields are modified

- Test list of data models in FigureModel

- Setup canvas with gl in FigureModel

- Clear canvas color in redraw function

- Upload textures from data models

- Build gl program and draw opaque tetrahedron

- Setup context loss handling

- Plot models in order of complication (the first models here do not require cell sorting):

  - surface with constant color (by drawing all tet faces)

    - need texture for cells
    - need texture for coordinates
    - need proper drawElementsInstanced call

    - culling on
    - blend off
    - fragColor = vec4(1,1,1,1);

  - surface with coloring

    - need texture for emission function
    - need texture for lut

    - fragColor = vec4(lut(emission), 1);

  - mip v1

    - clear to black
    - culling off -> not an approximation!
    - blend = max(framebuffer, fragColor)
    - fragColor = vec4(lut(emission), 1.0)

  - xray approximation

    - need depth computation
    - need textoure for density

    - clear to white
    - blend = framebuffer.rgb * fragColor.a + 0 * fragColor.rgb
    - a = depth * lut(density)  // approximation
    - fragColor = vec4(0, 0, 0, a)

  - xray

    - need gradient of density function
    - need front and back computation for density function

    - a = depth * 0.5 * (lut(density_front) + lut(density_back))

  - mip v2

    - need gradient of emission function
    - need front and back computation for emission function

    - culling on -> half triangles, half fragments, shaders more expensive
    - fragColor = max(lut(emission_front), lut(emission_back))

  - splat

  - isosurfaces

    - need computation of isosurface texture

  - absorption-emission

    - need everything above
    - need cell sorting
    - several models to choose from


=== Alternative ray models:

- Maximum intensity:
   - I(D) = f( sup_s f(s) )
   - Depth buffer: Off
   - Blend equation: Max(I_src, I_dst)
   - Cell ordering: No
   - Variants:
       - Direct one phase:
            fragColor = u_emissionColor * max(f0, f1);
       - Direct two phase:
            fragColor = max(f0, f1);
            Compose framebuffer with colormap in separate phase
       - Indirect two phase (scalar intensitymap f -> R):
            fragColor = max(intensitymap(f0), intensitymap(f1));
            Compose framebuffer with colormap in separate phase
       - Indirect one phase (saturates color?, colormap f -> rgb):
            fragColor = max(colormap(f0), colormap(f1));

- Splatting:
   - I(D) = int_0^D C(f(s)) ds
   - Depth buffer: Off
   - Blend equation: Sum(I_src, I_dst)
   - Cell ordering: No
   - fragColor = depth * texture(u_colormap, vec2(0.5f*(f0+f1), 0.5f)).rgb;

- Isosurfaces:
   - Let F = { f_i } be a discrete set of function values
   - Let C(f) be a colormap
   - Visible isosurface fragment is C(f(z)) for closest z where f(z) in F
        I(D) = C( f( sup_s f(s) in F ) )
   - "Arbitrary" number of opaque surfaces using texture:
        isoValue[f0,f1] = first isosurface value in [f0,f1] (closest to f0)
        isoColor[f0,f1] = colormap(isoValue[f0,f1])  // Precomposed
   - What if we want to color with another function?
        I(D) = C( g( sup_s f(s) in F ) )
        isoDist[f0,f1] = distance from f0 (z=0) towards f1 (z=1) of isoValue[f0,f1]
        s = isoDist[f0,f1]
        g = (1-s)*g0 + s*g1
        fragColor = colormap(g)
   - Depth buffer: On
   - Blend equation: Off
   - Cell ordering: No
   - Still need ray length to compute f1
   - Create texture:  u_isosurface[f0, f1] = first isosurface value in [f0,f1]
   - vec4 texel = texture(u_isosurface, vec2(f0, f1));
   - Variants:
       - Isosurface texture precomposed with colormap:
           fragColor = texel;
       - Compose with colormap:
           fragColor = texture(u_colormap, texel.x);

- Direct volume rendering:
   - T(s) = exp(-int_s^D tau rho(g(t)) dt)
   - I(D) = I(0) T(0) + int_0^D C(f(s)) rho(g(s)) T(s) ds
   - Depth buffer: Off (can use depth test to preserve opaque background)
   - Blend equation: (1 - A_dst) * I_src + I_dst
   - Cell ordering: Yes
   - Variants: (I), (II), (III) below

- (I) Fully piecewise constant emission and extinction (current)
  - Note: If f is also piecewise constant, don't need gradient and f0 == f1

- (II) Piecewise linear emission and extinction (Mooreland)

- (III) Arbitrary extinction transfer function with 2D texture lookup
  - Assuming piecewise constant C,
       int_0^D C rho exp(-int_s^D A rho dt) ds
       = C int_0^D d/ds exp(-int_s^D A rho dt) ds
       = C (exp(-int_D^D A rho dt) - exp(-int_0^D A rho dt))
       = C (1 - T)
       T = exp(-A int_0^D rho dt)
  - Using f = (1-r)f0 + r f1, r in [0,1]:
       r = t/D,  1-r = 1-t/D,  dr = 1/D dt,  r(t=s) = s/D,  r(t=D) = 1
       U = int_0^D rho(f(t)) dt
         = int_0^D rho( (1 - t/D)*f0 + (t/D)*f1 ) dt
         = D int_0^1 rho( (1-r)*f0 + r*f1 ) dr
  - Preintegrating R(f0,f1) = int_0^1 rho( (1-r)*f0 + r*f1 ) dr

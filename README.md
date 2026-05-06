# Vector Graphics Rasterization

**Live demo:** https://galmungral.github.io/newton-vg/

## Rhetorical Design

### Purpose

Scanline rasterization — the conventional approach to rendering 2D vector graphics — has no clean closed-form analytic formulation. The same problem can be expressed cleanly as a signed distance field: for each pixel, compute the signed distance to the nearest curve, and derive coverage from that distance. This formulation is mathematically precise and admits a direct numerical solution, at the cost of being more expensive to evaluate.

### Strategy

Each path segment is a cubic Bézier curve. The signed distance from a pixel to a curve is computed by minimizing the squared distance — a degree-6 polynomial in the curve parameter — and finding its roots. Fill is determined by a winding number count; stroke by thresholding the distance. The entire computation runs in a fragment shader on the GPU, with one thread per pixel.

## Technical Challenges

### Coverage Model

We approximate the coverage of each pixel $`p`$ by the fill and stroke of a curve $`\gamma`$ using the coverage of a disk of radius $`R \approx \sqrt{2}/2`$ centered at $`p`$ by half-planes:

```math
\alpha_{f}(\gamma, p) := \frac{1}{\pi R^2}\int_{d(\gamma, p)}^R{\sqrt{1-r^2}\,dr}, \quad \alpha_{s}(\gamma, p) := \frac{1}{\pi R^2}\int_{d_{-}(\gamma, p)}^{d_{+}(\gamma, p)}{\sqrt{1-r^2}\,dr}
```

where

```math
d(\gamma, p) := (-1)^{wind(\gamma, p)}\min\left\{\min_{q\in \gamma}{d(p, q)}, R\right\}, \quad d_{\pm}(\gamma, p) := \min\left\{\max\left\{\min_{q\in \gamma}{d(p, q)} \pm \frac{w}{2}, -R \right\}, R\right\}.
```

### Polynomial Root Finding

For each point $`p = (x, y)`$ and each cubic segment $`\gamma_i(t) = (x_i(t), y_i(t))`$, where $`x_i(t) = at^3 + bt^2 + ct + d`$ and $`y_i(t) = et^3 + ft^2 + gt + h`$, we compute two values: (i) the number of intersections between $`\gamma_i`$ and a ray originating at $`p`$ and extending to the left, and (ii) the minimum distance between $`p`$ and $`\gamma_i`$.

The number of intersections is obtained by counting the roots of the cubic polynomial $`y_i(t) - y`$. More specifically, using the Iverson bracket,

```math
\sum_{t \in [0,1)}\left[ at^3+bt^2+ct+d-x < 0 \wedge et^3+ft^2+gt+h-y = 0 \right]
```

The total number of intersections has the same parity as the winding number

```math
wind(\gamma, p) \equiv \sum_i\sum_{t \in [0,1)}\left[x_i(t) - x_p < 0 \wedge y_i(t) - y_p = 0 \right] \pmod 2
```

The minimum squared distance

```math
\min_{q\in \gamma_i}{d^2(p, q)} = \min_{t\in [0,1)} \left[(at^3+bt^2+ct+d-x)^2 + (et^3+ft^2+gt+h-y)^2\right]
```

is computed by evaluating the function at its critical points, which are the roots of its derivative, a [quintic polynomial](https://mathworld.wolfram.com/AbelsImpossibilityTheorem.html):

```math
6(a^2 + e^2)t^5 + 10(ab + ef)t^4 + (8ac + 8eg + 4b^2 + 4f^2)t^3 + 6(ad + bc + eh + fg)t^2 + (4bd + 4fh + 2c^2 + 2g^2)t + 2cd + 2gh.
```

To find the roots of these polynomials numerically, we follow the interval splitting method from [Yuksel (2022)](https://dl.acm.org/doi/10.1145/3532836.3536266): First, apply the root-finding algorithm recursively to locate the critical points of the polynomial. Then, split $`[0,1)`$ into intervals where the polynomial is monotonic, and apply a fixed number of Newton's iterations in each interval.

### GPU Warp Divergence and Floating-Point Precision

Running the computation on the GPU amortizes the cost across pixels, but the root-finding involves branching that depends on the specific parameters of each curve. Threads in the same warp that take different branches are serialized, wasting the available parallelism. Additionally, the quality of the results depends on IEEE-754 floating-point precision. The single-precision WebGPU implementation failed to solve the quintic equation accurately in some cases, while the double-precision JavaScript implementation produced fewer such errors, as visible in the side-by-side comparison in the live demo.

## References

Cem Yuksel. 2022. *A Fast & Robust Solution for Cubic & Higher-Order Polynomials.* In ACM SIGGRAPH 2022 Talks (SIGGRAPH '22). https://doi.org/10.1145/3532836.3536266
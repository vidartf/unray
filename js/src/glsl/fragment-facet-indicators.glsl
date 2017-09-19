// TODO: Untested draft:
// TODO: Use texture lookup to find color and .a=0|1 discard status
// ivec4 facet_indicators = ivec4(v_facet_indicators);
ivec4 facet_indicators = ivec4(0, 1, 0, 1);
int facet_indicator_value = 0;

float eps = 1e-2;  // TODO: Configurable tolerance
for (int i = 0; i < 4; ++i) {
    if (v_barycentric_coordinates[i] < eps) {
        if (facet_indicators[i] == facet_indicator_value) {
            discard;
        }
    }
}
bool front_in_range = u_volume_interval.x <= front && front <= u_volume_interval.y;
bool back_in_range = u_volume_interval.x <= back && back <= u_volume_interval.y;

// If values are not in interval, discard this fragment
if (!(front_in_range || back_in_range)) {
    discard;
}

// Select interval value closest to camera
float value;
if (front_in_range) {
    value = front;
} else if (front > back) {
    value = u_volume_interval.y;
} else {
    value = u_volume_interval.x;
}

// TODO: Revamp this code, looking at
//   fragment-isosurface.glsl to complete it